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
import { GroqService, ZScoreData, PreviousCounseling } from '../../services/groq-service';
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
  
  // AI Generated Questions & Kader Answers
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
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

      if (prevErr) {
        // Jika tabel penyuluhans belum dibuat/di-migrate di Supabase, cetak warning tapi jangan crash
        console.warn('Penyuluhans table might not exist or failed to query:', prevErr);
      } else if (prevData && prevData.length > 0) {
        const lastSession = prevData[0];
        setPreviousSession({
          tanggal: lastSession.tanggal,
          pertanyaan: lastSession.pertanyaan,
          jawaban: lastSession.jawaban,
          rekomendasi: lastSession.rekomendasi,
        });
      }

      // 4. Tahap Pembuatan Pertanyaan AI
      setStage('generating-questions');
      setLoadingText('AI sedang merumuskan pertanyaan wawancara khusus...');

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

      const generatedQ = await GroqService.generateQuestions(
        balitaData as Balita,
        metrics,
        ageMonths,
        prevData && prevData.length > 0 ? (prevData[0] as PreviousCounseling) : null
      );

      setQuestions(generatedQ);
      setAnswers(new Array(generatedQ.length).fill(''));
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

  const handleAnswerChange = (index: number, text: string) => {
    const updated = [...answers];
    updated[index] = text;
    setAnswers(updated);
  };

  const handleSubmitInterview = async () => {
    // Validasi input jawaban minimal diisi
    const unfilledCount = answers.filter(a => a.trim().length === 0).length;
    if (unfilledCount > 0) {
      Alert.alert(
        'Jawaban Belum Lengkap',
        `Masih ada ${unfilledCount} jawaban kosong. Apakah Anda ingin melanjutkan dan membiarkan AI mengisi sisanya?`,
        [
          { text: 'Lengkapi Dulu', style: 'cancel' },
          { text: 'Lanjutkan', onPress: () => processRecommendation() }
        ]
      );
    } else {
      processRecommendation();
    }
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

      const qaList = questions.map((q, idx) => ({
        question: q,
        answer: answers[idx]?.trim() || 'Tidak dijawab / kondisi umum anak baik.',
      }));

      // 1. Generate rekomendasi dari Groq
      const rec = await GroqService.generateRecommendations(balita, metrics, ageMonths, qaList);
      setAiRecommendation(rec);

      // 2. Simpan Sesi Penyuluhan ke Supabase
      const payload = {
        balita_id: balita.id,
        penimbangan_id: penimbangan.id,
        kader_id: user?.id || null,
        tanggal: todayStr,
        pertanyaan: questions,
        jawaban: answers.map(a => a.trim() || 'Tidak dijawab'),
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

              {/* Memory Box Alert if previous memory exists */}
              {previousSession && (
                <View style={styles.memoryAlert}>
                  <Brain size={18} color="#0D9488" />
                  <Text style={styles.memoryAlertText}>
                    AI mendeteksi memori penyuluhan bulan lalu (${format(new Date(previousSession.tanggal), 'MMMM yyyy', { locale: idLocale })}). Pertanyaan di bawah ini dirancang berkembang dari riwayat tersebut.
                  </Text>
                </View>
              )}

              {/* Dynamic Questions List */}
              <Text style={styles.sectionTitle}>Pertanyaan Wawancara Meja 4/5</Text>
              {questions.map((q, index) => (
                <Card key={index} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionNumberCircle}>
                      <Text style={styles.questionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.questionText}>{q}</Text>
                  </View>
                  <View style={styles.inputGroup}>
                    <MessageSquare size={18} color="#94A3B8" style={{ marginTop: 12, marginRight: 8, alignSelf: 'flex-start' }} />
                    <TextInput
                      style={styles.answerInput}
                      placeholder="Masukkan jawaban atau respon orang tua..."
                      multiline
                      numberOfLines={3}
                      value={answers[index]}
                      onChangeText={(text) => handleAnswerChange(index, text)}
                    />
                  </View>
                </Card>
              ))}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitInterview}>
                <Sparkles size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>Proses Hasil Penyuluhan AI</Text>
              </TouchableOpacity>
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
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 22,
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 8,
    marginTop: 12,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
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
