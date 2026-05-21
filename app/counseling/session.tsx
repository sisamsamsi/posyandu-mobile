// app/counseling/session.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Brain,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Baby,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan } from '../../lib/types';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { GroqService, ZScoreData, PreviousCounseling, AdaptiveQuestion, InterviewQA } from '../../services/groq-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type SessionStage = 
  | 'loading-data' 
  | 'generating-questions' 
  | 'interview' 
  | 'generating-recommendations' 
  | 'success';

export default function CounselingSessionScreen() {
  const router = useRouter();
  const { balitaId, penimbanganId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { activePosyanduId } = useServiceStore();

  const [stage, setStage] = useState<SessionStage>('loading-data');
  const [loadingText, setLoadingText] = useState('Memuat data...');

  // Core Data States
  const [balita, setBalita] = useState<Balita | null>(null);
  const [penimbangan, setPenimbangan] = useState<Penimbangan | null>(null);
  const [posyandu, setPosyandu] = useState<any>(null);
  const [previousSession, setPreviousSession] = useState<PreviousCounseling | null>(null);
  
  // Wizard & Adaptive States (Skema B)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeQuestion, setActiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [questionsHistory, setQuestionsHistory] = useState<AdaptiveQuestion[]>([]);
  const [qaList, setQaList] = useState<InterviewQA[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [catatanKader, setCatatanKader] = useState<string>('');
  const [loadingNext, setLoadingNext] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (balitaId && penimbanganId) {
      initializeSession();
    } else {
      Alert.alert('Error', 'ID Balita atau Penimbangan tidak ditemukan.');
      router.back();
    }
  }, [balitaId, penimbanganId]);

  const initializeSession = async () => {
    try {
      setStage('loading-data');
      setLoadingText('Mengambil riwayat tumbuh kembang...');

      // 1. Ambil data balita beserta posyandunya
      const { data: balitaData, error: balitaErr } = await supabase
        .from('balitas')
        .select('*, posyandu:posyandus(*)')
        .eq('id', balitaId)
        .single();

      if (balitaErr) throw balitaErr;
      setBalita(balitaData as Balita);
      setPosyandu(balitaData.posyandu);

      // 2. Ambil data penimbangan hari ini
      const { data: penimbanganData, error: penimbanganErr } = await supabase
        .from('penimbangans')
        .select('*')
        .eq('id', penimbanganId)
        .single();

      if (penimbanganErr) throw penimbanganErr;
      setPenimbangan(penimbanganData as Penimbangan);

      // 3. Ambil data penyuluhan bulan lalu (jika ada)
      const { data: prevData, error: prevErr } = await supabase
        .from('penyuluhans')
        .select('*')
        .eq('balita_id', balitaId)
        .order('created_at', { ascending: false })
        .limit(1);

      let prevSessionObj: PreviousCounseling | null = null;
      if (prevErr) {
        console.warn('Penyuluhans table might not exist or failed to query:', prevErr);
      } else if (prevData && prevData.length > 0) {
        const lastSession = prevData[0];
        prevSessionObj = {
          tanggal: lastSession.tanggal,
          pertanyaan: lastSession.pertanyaan,
          jawaban: lastSession.jawaban,
          rekomendasi: lastSession.rekomendasi,
        };
        setPreviousSession(prevSessionObj);
      }

      // 4. Tahap Pembuatan Pertanyaan Langkah 1 AI (Gizi & MPASI)
      setStage('generating-questions');
      setLoadingText('AI sedang menganalisis status tumbuh kembang & merumuskan pertanyaan gizi khusus...');

      const ageMonths = calculateAgeMonths(balitaData.tanggal_lahir, todayStr);
      const metrics: ZScoreData = {
        berat_badan: penimbanganData.berat_badan,
        tinggi_badan: penimbanganData.tinggi_badan,
        lingkar_kepala: penimbanganData.lingkar_kepala,
        lingkar_lengan: penimbanganData.lingkar_lengan || null,
        zscore_bb_u: penimbanganData.zscore_bb_u,
        status_bb_u: penimbanganData.status_bb_u,
        zscore_tb_u: penimbanganData.zscore_tb_u,
        status_tb_u: penimbanganData.status_tb_u,
        zscore_bb_tb: penimbanganData.zscore_bb_tb,
        status_bb_tb: penimbanganData.status_bb_tb,
      };

      const firstQ = await GroqService.generateNextQuestion(
        balitaData as Balita,
        metrics,
        ageMonths,
        [],
        prevSessionObj
      );

      setActiveQuestion(firstQ);
      setQuestionsHistory([firstQ]);
      setQaList([]);
      setCurrentStep(1);
      setCurrentAnswer('');
      setStage('interview');
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        'Gagal Memulai Sesi',
        e.message || 'Terjadi kesalahan saat memproses data awal. Silakan periksa kembali konfigurasi database atau koneksi Anda.'
      );
      router.back();
    }
  };

  const calculateAgeMonths = (birthDate: string, measureDate: string): number => {
    const birth = new Date(birthDate);
    const measure = new Date(measureDate);
    return (measure.getFullYear() - birth.getFullYear()) * 12 + (measure.getMonth() - birth.getMonth());
  };

  const handleNextStep = () => {
    if (!activeQuestion) return;

    if (currentAnswer.trim().length === 0) {
      Alert.alert(
        'Jawaban Belum Lengkap',
        'Kader disarankan mengisi jawaban orang tua agar analisis AI lebih mendalam. Apakah Anda yakin ingin membiarkannya kosong?',
        [
          { text: 'Lengkapi Jawaban', style: 'cancel' },
          { text: 'Tetap Lanjut', onPress: () => proceedToNext() }
        ]
      );
    } else {
      proceedToNext();
    }
  };

  const proceedToNext = async () => {
    if (!activeQuestion || !balita || !penimbangan) return;

    const answerText = currentAnswer.trim() || 'Tidak dijawab / kondisi umum anak baik.';
    const updatedQaList = [
      ...qaList,
      { question: activeQuestion.question, answer: answerText }
    ];
    setQaList(updatedQaList);
    setCurrentAnswer('');

    if (currentStep < 3) {
      setLoadingNext(true);
      try {
        const ageMonths = calculateAgeMonths(balita.tanggal_lahir, todayStr);
        const metrics: ZScoreData = {
          berat_badan: penimbangan.berat_badan,
          tinggi_badan: penimbangan.tinggi_badan,
          lingkar_kepala: penimbangan.lingkar_kepala,
          lingkar_lengan: penimbangan.lingkar_lengan || null,
          zscore_bb_u: penimbangan.zscore_bb_u,
          status_bb_u: penimbangan.status_bb_u,
          zscore_tb_u: penimbangan.zscore_tb_u,
          status_tb_u: penimbangan.status_tb_u,
          zscore_bb_tb: penimbangan.zscore_bb_tb,
          status_bb_tb: penimbangan.status_bb_tb,
        };

        // Dapatkan pertanyaan berikutnya secara adaptif dari AI
        const nextQ = await GroqService.generateNextQuestion(
          balita,
          metrics,
          ageMonths,
          updatedQaList,
          previousSession
        );

        setQuestionsHistory([...questionsHistory, nextQ]);
        setActiveQuestion(nextQ);
        setCurrentStep(currentStep + 1);
      } catch (err: any) {
        console.error(err);
        Alert.alert('Gagal Merancang Pertanyaan', err.message || 'Terjadi gangguan jaringan atau kunci Groq bermasalah.');
      } finally {
        setLoadingNext(false);
      }
    } else {
      // Pindah ke Langkah 4: Rangkuman & Catatan Khusus Kader (Opsional)
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 1) return;

    const prevIndex = currentStep - 2; // Step 2 -> Index 0, Step 3 -> Index 1, Step 4 -> Index 2
    const restoredQA = qaList[prevIndex];

    // Kurangi qaList ke indeks sebelumnya
    const updatedQaList = qaList.slice(0, prevIndex);
    setQaList(updatedQaList);

    // Kembalikan isi jawaban kader sebelumnya ke input teks
    setCurrentAnswer(restoredQA ? restoredQA.answer : '');

    // Set active question dari history
    setActiveQuestion(questionsHistory[prevIndex]);

    // Kurangi langkah
    setCurrentStep(currentStep - 1);
  };

  const processRecommendation = async () => {
    if (!balita || !penimbangan) return;

    setStage('generating-recommendations');
    setLoadingText('Kecerdasan Gizi AI sedang menyusun rekomendasi...');

    try {
      const ageMonths = calculateAgeMonths(balita.tanggal_lahir, todayStr);
      const metrics: ZScoreData = {
        berat_badan: penimbangan.berat_badan,
        tinggi_badan: penimbangan.tinggi_badan,
        lingkar_kepala: penimbangan.lingkar_kepala,
        lingkar_lengan: penimbangan.lingkar_lengan || null,
        zscore_bb_u: penimbangan.zscore_bb_u,
        status_bb_u: penimbangan.status_bb_u,
        zscore_tb_u: penimbangan.zscore_tb_u,
        status_tb_u: penimbangan.status_tb_u,
        zscore_bb_tb: penimbangan.zscore_bb_tb,
        status_bb_tb: penimbangan.status_bb_tb,
      };

      // 1. Generate rekomendasi dari Groq
      const rec = await GroqService.generateRecommendations(balita, metrics, ageMonths, qaList, catatanKader);
      setAiRecommendation(rec);

      // 2. Simpan Sesi Penyuluhan ke Supabase
      const payload = {
        balita_id: balita.id,
        penimbangan_id: penimbangan.id,
        kader_id: user?.id || null,
        tanggal: todayStr,
        pertanyaan: qaList.map(item => item.question),
        jawaban: qaList.map(item => item.answer),
        rekomendasi: rec,
      };

      const { error: saveErr } = await supabase.from('penyuluhans').insert(payload);
      if (saveErr) {
        console.warn('Failed to save to penyuluhans table in Supabase. You might need to run the SQL migration.', saveErr);
        Alert.alert(
          'Pemberitahuan',
          'Rekomendasi AI berhasil dibuat, namun gagal disimpan di riwayat database. Silakan pastikan tabel "penyuluhans" telah di-migrate di Supabase Anda.'
        );
      }

      setStage('success');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Gagal Memproses Rekomendasi', e.message || 'Terjadi gangguan jaringan.');
      setStage('interview');
      setCurrentStep(4); // Kembalikan ke halaman konfirmasi
    }
  };

  const handleShareWhatsAppUnified = async () => {
    if (!balita || !penimbangan || !aiRecommendation) return;

    // Gabungkan data timbangan dan AI ke dalam satu pesan terpadu
    const message = WhatsAppService.generateHasilUnified(
      balita,
      penimbangan,
      aiRecommendation,
      posyandu
    );

    if (balita.no_hp_ortu) {
      await WhatsAppService.openWhatsApp(balita.no_hp_ortu, message);
    } else {
      Alert.alert(
        'WhatsApp Wali Tidak Terdaftar',
        'Balita ini tidak memiliki nomor HP orang tua terdaftar. Salin pesan untuk dikirim secara manual?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Salin Pesan',
            onPress: async () => {
              const { setStringAsync } = await import('expo-clipboard');
              await setStringAsync(message);
              Alert.alert('Sukses', 'Pesan terpadu berhasil disalin ke clipboard.');
            }
          }
        ]
      );
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Nutrisi & MPASI';
      case 2: return 'Kesehatan & Infeksi';
      case 3: return 'Pola Asuh & Sanitasi';
      case 4: return 'Catatan Khusus';
      default: return '';
    }
  };

  const getStepDesc = (step: number) => {
    switch (step) {
      case 1: return 'AI menggali kualitas asupan gizi, frekuensi makan, dan protein hewani si kecil.';
      case 2: return 'AI menganalisis kerentanan anak terhadap infeksi dan perlindungan imunisasinya.';
      case 3: return 'AI mengevaluasi kebiasaan asuhan makan (feeding rules) serta kebersihan air/sanitasi.';
      case 4: return 'Tinjau kembali seluruh rangkuman jawaban orang tua dan tambahkan catatan klinis lapangan Anda.';
      default: return '';
    }
  };

  const getPlaceholderText = (step: number) => {
    switch (step) {
      case 1: return 'Contoh: Makan bubur lumat 3x sehari porsi 3 sdm, lauk hati ayam blender halus & telur kocok setengah butir. Tidak ada penolakan saat disuapi.';
      case 2: return 'Contoh: Sempat batuk pilek ringan selama 3 hari minggu lalu, tanpa demam. Imunisasi dasar lengkap sesuai usia. Nafsu makan anak sedikit turun saat sakit.';
      case 3: return 'Contoh: Ibu menyuapi langsung secara telaten tanpa memaksa. Anak tidak makan sambil bermain HP. Air minum bersumber dari sumur bersih yang dimasak matang.';
      default: return '';
    }
  };

  // Rendering Helper
  const renderStageContent = () => {
    switch (stage) {
      case 'loading-data':
      case 'generating-questions':
      case 'generating-recommendations':
        return (
          <View style={styles.centerContainer}>
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <View style={styles.spinnerPulse}>
                <Sparkles size={24} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.loadingTitle}>Proses Kecerdasan Gizi AI</Text>
            <Text style={styles.loadingDesc}>{loadingText}</Text>
          </View>
        );

      case 'interview':
        if (loadingNext) {
          return (
            <View style={styles.centerContainer}>
              <View style={styles.spinnerWrapper}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <View style={styles.spinnerPulse}>
                  <Brain size={24} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.loadingTitle}>AI Sedang Berpikir...</Text>
              <Text style={styles.loadingDesc}>
                AI sedang menganalisis respon Anda dan merumuskan pertanyaan berikutnya secara spesifik & adaptif...
              </Text>
            </View>
          );
        }

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              
              {/* Profile Card Header */}
              <View style={styles.profileSummaryCard}>
                <View style={styles.profileSummaryHeader}>
                  <Baby size={32} color={COLORS.primaryDark} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.profileName}>{balita?.nama}</Text>
                    <Text style={styles.profileAge}>
                      {balita?.jenis_kelamin} • {calculateAgeMonths(balita?.tanggal_lahir || '', todayStr)} bulan
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryZscores}>
                  <View style={styles.zscoreBadge}>
                    <Text style={styles.zscoreBadgeLabel}>BB/U</Text>
                    <Text style={styles.zscoreBadgeVal}>{penimbangan?.status_bb_u}</Text>
                  </View>
                  <View style={styles.zscoreBadge}>
                    <Text style={styles.zscoreBadgeLabel}>TB/U</Text>
                    <Text style={styles.zscoreBadgeVal}>{penimbangan?.status_tb_u}</Text>
                  </View>
                  <View style={styles.zscoreBadge}>
                    <Text style={styles.zscoreBadgeLabel}>BB/TB</Text>
                    <Text style={styles.zscoreBadgeVal}>{penimbangan?.status_bb_tb}</Text>
                  </View>
                </View>
              </View>

              {/* Step Progress Tracker */}
              <View style={styles.stepTrackerCard}>
                <View style={styles.stepTrackerHeader}>
                  <Text style={styles.stepTrackerStep}>LANGKAH {currentStep} DARI 4</Text>
                  <Text style={styles.stepTrackerTitle}>{getStepTitle(currentStep)}</Text>
                </View>
                <Text style={styles.stepTrackerDesc}>{getStepDesc(currentStep)}</Text>
                
                {/* Visual Premium Line Tracker */}
                <View style={styles.trackerProgressBar}>
                  <View style={[styles.trackerProgressBarFill, { width: `${(currentStep / 4) * 100}%` }]} />
                </View>
              </View>

              {/* Memory Box Alert if previous memory exists (Hanya di langkah 1) */}
              {currentStep === 1 && previousSession && (
                <View style={styles.memoryAlert}>
                  <Brain size={18} color="#0D9488" />
                  <Text style={styles.memoryAlertText}>
                    AI mendeteksi memori penyuluhan bulan lalu ({format(new Date(previousSession.tanggal), 'MMMM yyyy', { locale: idLocale })}). Pertanyaan pertama dirancang berkembang dari riwayat asuhan tersebut.
                  </Text>
                </View>
              )}

              {/* Dynamic Step Content */}
              {currentStep <= 3 ? (
                <View>
                  {/* Card Pertanyaan AI */}
                  <Card style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <View style={styles.questionNumberCircle}>
                        <Text style={styles.questionNumberText}>{currentStep}</Text>
                      </View>
                      <Text style={styles.questionText}>{activeQuestion?.question}</Text>
                    </View>

                    {/* Box Panduan Eksplorasi Kader Posyandu (💡 PANDUAN PENGGALIAN KADER) */}
                    <View style={styles.guidanceContainer}>
                      <View style={styles.guidanceHeader}>
                        <Brain size={16} color="#0F766E" />
                        <Text style={styles.guidanceTitle}>💡 PANDUAN WAWANCARA KADER</Text>
                      </View>
                      <Text style={styles.guidanceText}>{activeQuestion?.guidance}</Text>
                    </View>

                    {/* Input Jawaban */}
                    <Text style={styles.inputLabel}>Tulis Respon Orang Tua:</Text>
                    <View style={styles.inputGroup}>
                      <MessageSquare size={18} color="#94A3B8" style={{ marginTop: 12, marginRight: 8, alignSelf: 'flex-start' }} />
                      <TextInput
                        style={styles.answerInput}
                        placeholder={getPlaceholderText(currentStep)}
                        multiline
                        numberOfLines={4}
                        value={currentAnswer}
                        onChangeText={setCurrentAnswer}
                      />
                    </View>
                  </Card>

                  {/* Navigation Button Row */}
                  <View style={styles.buttonRow}>
                    {currentStep > 1 && (
                      <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                        <ArrowLeft size={18} color="#64748B" />
                        <Text style={styles.backStepBtnText}>Kembali</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.nextStepBtn} onPress={handleNextStep}>
                      <Text style={styles.nextStepBtnText}>
                        {currentStep === 3 ? 'Simpan & Tinjau' : 'Lanjut'}
                      </Text>
                      <ChevronRight size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Langkah 4: Rangkuman Q&A & Catatan Khusus Kader */
                <View>
                  <Text style={styles.sectionTitle}>Rangkuman Tanya Jawab Sesi Ini</Text>
                  
                  {qaList.map((item, idx) => (
                    <Card key={idx} style={styles.summaryCard}>
                      <View style={styles.summaryQuestionHeader}>
                        <Text style={styles.summaryQuestionNumber}>Langkah {idx + 1}: {getStepTitle(idx + 1)}</Text>
                        <Text style={styles.summaryQuestionText}>{item.question}</Text>
                      </View>
                      <View style={styles.summaryAnswerContainer}>
                        <Text style={styles.summaryAnswerLabel}>Respon:</Text>
                        <Text style={styles.summaryAnswerText}>"{item.answer}"</Text>
                      </View>
                    </Card>
                  ))}

                  {/* Input Catatan Khusus Kader (Opsional) */}
                  <Card style={styles.notesCard}>
                    <View style={styles.notesHeader}>
                      <ClipboardList size={20} color={COLORS.primary} />
                      <Text style={styles.notesTitle}>Catatan Khusus Kader (Opsional)</Text>
                    </View>
                    <Text style={styles.notesDesc}>
                      Tuliskan pengamatan lapangan penting secara bebas (misal: fisik anak lesu, rambut kusam pirang, riwayat TBC keluarga, atau masalah pengasuhan) untuk memperkuat rekomendasi AI.
                    </Text>
                    <View style={styles.notesInputGroup}>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Contoh: Kulit anak agak kusam, mata lesu. Ibu bercerita bahwa anak sering rewel semenjak disapih dan tinggal dengan nenek karena ibu bekerja di pabrik..."
                        multiline
                        numberOfLines={4}
                        value={catatanKader}
                        onChangeText={setCatatanKader}
                      />
                    </View>
                  </Card>

                  {/* Navigation Button Row */}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.backStepBtn} onPress={handlePrevStep}>
                      <ArrowLeft size={18} color="#64748B" />
                      <Text style={styles.backStepBtnText}>Kembali</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.nextStepBtn, { backgroundColor: COLORS.primary }]} onPress={processRecommendation}>
                      <Sparkles size={18} color="#FFF" />
                      <Text style={styles.nextStepBtnText}>Proses Rekomendasi AI</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case 'success':
        return (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.successHeader}>
              <CheckCircle2 size={56} color="#22C55E" />
              <Text style={styles.successTitle}>Penyuluhan AI Selesai!</Text>
              <Text style={styles.successDesc}>Rekomendasi gizi personal berhasil dirumuskan oleh kecerdasan buatan.</Text>
            </View>

            {/* Glassmorphic AI Recommendation Card */}
            <Card style={styles.premiumAdviceCard}>
              <View style={styles.adviceCardHeader}>
                <Sparkles size={22} color={COLORS.primary} />
                <Text style={styles.adviceCardTitle}>Rekomendasi Gizi & Stimulasi</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.adviceMarkdown}>{aiRecommendation}</Text>
            </Card>

            {/* Combined WhatsApp Button */}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#25D366' }]} 
              onPress={handleShareWhatsAppUnified}
            >
              <Send size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Kirim Laporan Terpadu (WA)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F1F5F9', marginTop: 12 }]} 
              onPress={() => router.replace('/counseling/queue')}
            >
              <ClipboardList size={18} color="#64748B" />
              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Kembali ke Antrean</Text>
            </TouchableOpacity>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      {stage !== 'loading-data' && stage !== 'generating-questions' && stage !== 'generating-recommendations' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Sesi Penyuluhan Terbimbing</Text>
            <Text style={styles.headerSub}>Konseling Gizi Bertenaga AI</Text>
          </View>
        </View>
      )}

      {renderStageContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  spinnerWrapper: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinnerPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileSummaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  profileAge: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  summaryZscores: {
    flexDirection: 'row',
    gap: 8,
  },
  zscoreBadge: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  zscoreBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  zscoreBadgeVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
    textAlign: 'center',
  },
  stepTrackerCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  stepTrackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTrackerStep: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  stepTrackerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  stepTrackerDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  trackerProgressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackerProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  memoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  memoryAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#006A63',
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  questionCard: {
    marginBottom: 16,
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  questionNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    lineHeight: 24,
  },
  guidanceContainer: {
    backgroundColor: '#F0FDFA',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  guidanceTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  guidanceText: {
    fontSize: 12,
    color: '#134E4A',
    lineHeight: 18,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  answerInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  backStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    gap: 6,
  },
  backStepBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  nextStepBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 16,
    gap: 6,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextStepBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryQuestionHeader: {
    marginBottom: 10,
  },
  summaryQuestionNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryQuestionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
  },
  summaryAnswerContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryAnswerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 2,
  },
  summaryAnswerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    fontStyle: 'italic',
  },
  notesCard: {
    marginBottom: 24,
    padding: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  notesDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  notesInputGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  notesInput: {
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  successHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  successDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '500',
  },
  premiumAdviceCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 24,
    borderRadius: 28,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  adviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  adviceCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#134E4A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  adviceMarkdown: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 24,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
