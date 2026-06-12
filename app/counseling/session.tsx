// app/counseling/session.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Share
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
  Smile,
  Trash2
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan, WHOReferenceRow } from '../../lib/types';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { GroqService, ZScoreData, PreviousCounseling, AdaptiveQuestion, InterviewQA, WeighingHistoryItem, ImunisasiStatus } from '../../services/groq-service';
import { ImunisasiService } from '../../services/imunisasi-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { calculateAgeMonths } from '../../lib/utils';
import { whoService } from '../../services/who-service';
import { GrowthChart } from '../../components/charts/GrowthChart';

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
  const [previousSessions, setPreviousSessions] = useState<PreviousCounseling[]>([]);
  const [weighingHistory, setWeighingHistory] = useState<WeighingHistoryItem[]>([]);
  const [imunisasiStatus, setImunisasiStatus] = useState<ImunisasiStatus | null>(null);
  
  // Wizard & Adaptive States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeQuestion, setActiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [questionsHistory, setQuestionsHistory] = useState<AdaptiveQuestion[]>([]);
  const [qaList, setQaList] = useState<InterviewQA[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [catatanKader, setCatatanKader] = useState<string>('');
  const [loadingNext, setLoadingNext] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');

  // Growth Trend & KMS State
  const [whoBB, setWhoBB] = useState<WHOReferenceRow[]>([]);
  const [whoTB, setWhoTB] = useState<WHOReferenceRow[]>([]);
  const [whoBBTB, setWhoBBTB] = useState<WHOReferenceRow[]>([]);
  const [chartIndicator, setChartIndicator] = useState<'BB' | 'TB' | 'BB_TB'>('BB');
  const [showKmsChart, setShowKmsChart] = useState(false);
  const [calculatedTrend, setCalculatedTrend] = useState<'N' | 'T' | '2T' | '-'>('-');
  const [balitaPenimbangans, setBalitaPenimbangans] = useState<Penimbangan[]>([]);

  const chatScrollRef = useRef<ScrollView>(null);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const renderTrendBadgeMini = (trend: 'N' | 'T' | '2T' | '-') => {
    switch (trend) {
      case '2T':
        return (
          <View style={[styles.trendBadgeMini, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.trendBadgeMiniText, { color: '#DC2626' }]}>2T</Text>
          </View>
        );
      case 'T':
        return (
          <View style={[styles.trendBadgeMini, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
            <Text style={[styles.trendBadgeMiniText, { color: '#D97706' }]}>T</Text>
          </View>
        );
      case 'N':
        return (
          <View style={[styles.trendBadgeMini, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Text style={[styles.trendBadgeMiniText, { color: '#15803D' }]}>N</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.trendBadgeMini, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
            <Text style={[styles.trendBadgeMiniText, { color: '#64748B' }]}>-</Text>
          </View>
        );
    }
  };

  useEffect(() => {
    if (balitaId && penimbanganId) {
      initializeSession();
    } else {
      Alert.alert('Error', 'ID Balita atau Penimbangan tidak ditemukan.');
      router.back();
    }
  }, [balitaId, penimbanganId]);

  // Auto scroll to end of chat when messages or typing status updates
  useEffect(() => {
    if (stage === 'interview') {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentStep, qaList, loadingNext, stage]);

  const initializeSession = async () => {
    try {
      setStage('loading-data');
      setLoadingText('Memuat data...');

      // 1. Ambil data balita beserta posyandunya
      const { data: balitaData, error: balitaErr } = await supabase
        .from('balitas')
        .select('*, posyandu:posyandus(*), imunisasi(*)')
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

      // 3. Ambil seluruh riwayat penimbangan balita untuk KMS & Tren
      const { data: historyData, error: historyErr } = await supabase
        .from('penimbangans')
        .select('*')
        .eq('balita_id', balitaId)
        .order('tanggal', { ascending: true }); // ascending for chart plotting

      if (historyErr) throw historyErr;
      const historyList = historyData as Penimbangan[];
      setBalitaPenimbangans(historyList);

      // Hitung trend berdasarkan history (descending untuk formula trend)
      let bbTrend: 'N' | 'T' | '2T' | '-' = '-';
      const descHistory = [...historyList].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      if (descHistory.length >= 2) {
        const w0 = descHistory[0];
        const w1 = descHistory[1];
        if (descHistory.length >= 3) {
          const w2 = descHistory[2];
          if (w0.berat_badan <= w1.berat_badan && w1.berat_badan <= w2.berat_badan) {
            bbTrend = '2T';
          }
        }
        if (bbTrend !== '2T' && w0.berat_badan <= w1.berat_badan) {
          bbTrend = 'T';
        }
        if (bbTrend === '-') {
          bbTrend = 'N';
        }
      }
      setCalculatedTrend(bbTrend);

      // Fetch WHO standards
      const [bb, tb, bbtb] = await Promise.all([
        whoService.getStandards('bb_u', balitaData.jenis_kelamin),
        whoService.getStandards('tb_u', balitaData.jenis_kelamin),
        whoService.getStandards('bb_tb', balitaData.jenis_kelamin)
      ]);
      setWhoBB(bb);
      setWhoTB(tb);
      setWhoBBTB(bbtb);

      // 4. Ambil data penyuluhan 3 bulan terakhir (jika ada)
      const { data: prevData, error: prevErr } = await supabase
        .from('penyuluhans')
        .select('*')
        .eq('balita_id', balitaId)
        .order('created_at', { ascending: false })
        .limit(3);

      let prevSessionsList: PreviousCounseling[] = [];
      if (prevErr) {
        console.warn('Penyuluhans table might not exist or failed to query:', prevErr);
      } else if (prevData && prevData.length > 0) {
        prevSessionsList = prevData.map(lastSession => ({
          tanggal: lastSession.tanggal,
          pertanyaan: lastSession.pertanyaan,
          jawaban: lastSession.jawaban,
          rekomendasi: lastSession.rekomendasi,
        }));
        setPreviousSessions(prevSessionsList);
        setPreviousSession(prevSessionsList[0]);
      }

      // Ambil data imunisasi dari balitaData
      let imunisasiData = null;
      if (balitaData && balitaData.imunisasi) {
        imunisasiData = Array.isArray(balitaData.imunisasi) && balitaData.imunisasi.length > 0 
          ? balitaData.imunisasi[0] 
          : balitaData.imunisasi;
      }
      
      const missingVaccines = ImunisasiService.getMissingVaccines(imunisasiData);
      const immunizationCompleteness = ImunisasiService.calculateCompleteness(imunisasiData);
      const imunStatusObj: ImunisasiStatus = {
        completeness: immunizationCompleteness,
        missing: missingVaccines
      };
      setImunisasiStatus(imunStatusObj);

      // Ambil riwayat penimbangan (weighingHistory) untuk dikirim ke AI
      const weighingHistoryList: WeighingHistoryItem[] = descHistory.slice(0, 4).map(h => ({
        tanggal: h.tanggal,
        berat_badan: h.berat_badan,
        tinggi_badan: h.tinggi_badan,
        zscore_bb_u: h.zscore_bb_u,
        status_bb_u: h.status_bb_u,
        zscore_tb_u: h.zscore_tb_u,
        status_tb_u: h.status_tb_u,
        zscore_bb_tb: h.zscore_bb_tb,
        status_bb_tb: h.status_bb_tb,
      }));
      setWeighingHistory(weighingHistoryList);

      // 5. Tahap Pembuatan Pertanyaan Langkah 1 AI (Gizi & MPASI)
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
        prevSessionsList,
        bbTrend,
        weighingHistoryList,
        imunStatusObj
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



  const handleNextStep = () => {
    const isStep4 = currentStep === 4;
    const currentVal = isStep4 ? catatanKader : currentAnswer;

    if (!isStep4 && currentVal.trim().length === 0) {
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
    if (currentStep === 4) {
      processRecommendation();
      return;
    }

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
          previousSessions,
          calculatedTrend,
          weighingHistory,
          imunisasiStatus
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

    if (currentStep === 4) {
      const lastQA = qaList[2];
      setCurrentAnswer(lastQA ? lastQA.answer : '');
      setActiveQuestion(questionsHistory[2]);
      setQaList(qaList.slice(0, 2));
      setCurrentStep(3);
      return;
    }

    const prevIndex = currentStep - 2;
    const restoredQA = qaList[prevIndex];

    const updatedQaList = qaList.slice(0, prevIndex);
    setQaList(updatedQaList);

    setCurrentAnswer(restoredQA ? restoredQA.answer : '');
    setActiveQuestion(questionsHistory[prevIndex]);
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
      const rec = await GroqService.generateRecommendations(
        balita, 
        metrics, 
        ageMonths, 
        qaList, 
        catatanKader,
        calculatedTrend,
        previousSessions,
        weighingHistory,
        imunisasiStatus
      );
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

      const { data: saveResult, error: saveErr } = await supabase
        .from('penyuluhans')
        .insert(payload)
        .select()
        .single();
      if (saveErr) {
        console.warn('Failed to save to penyuluhans table in Supabase. You might need to run the SQL migration.', saveErr);
        Alert.alert(
          'Pemberitahuan',
          'Rekomendasi AI berhasil dibuat, namun gagal disimpan di riwayat database. Silakan pastikan tabel "penyuluhans" telah di-migrate di Supabase Anda.'
        );
        setStage('success');
      } else if (saveResult) {
        router.replace(`/counseling/summary?id=${saveResult.id}`);
      } else {
        setStage('success');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Gagal Memproses Rekomendasi', e.message || 'Terjadi gangguan jaringan.');
      setStage('interview');
      setCurrentStep(4);
    }
  };

  const handleShareWhatsAppUnified = async () => {
    if (!balita || !penimbangan || !aiRecommendation) return;

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

  const getQuickReplies = (step: number, activeQ?: AdaptiveQuestion | null) => {
    if (step === 4) {
      return [
        "Anak tampak lincah, aktif, ceria, dan tidak ada tanda klinis lesu.",
        "Fisik anak tampak agak lesu dan rambut kusam.",
        "Keluarga sedang dalam pengawasan TBC/ISPA.",
        "Tidak ada catatan khusus lapangan."
      ];
    }

    if (!activeQ || !activeQ.focus_area) {
      switch (step) {
        case 1:
          return [
            "Makan 3x sehari lauk telur/ikan, tanpa penolakan.",
            "Nafsu makan anak berkurang, lebih suka minum susu/ASI.",
            "Anak sulit makan nasi, hanya mau makan camilan biskuit.",
            "Masih ASI eksklusif saja, belum mulai MPASI."
          ];
        case 2:
          return [
            "Anak sehat walafiat, tidak ada sakit dalam 2 minggu terakhir.",
            "Sempat batuk-pilek ringan selama 3 hari, nafsu makan stabil.",
            "Sempat demam dan diare ringan, sekarang sudah membaik.",
            "Imunisasi dasar lengkap sesuai jadwal umur anak."
          ];
        case 3:
          return [
            "Disuapi ibu dengan telaten tanpa gawai/HP.",
            "Rewel saat disuapi, sering diemut atau dilepeh.",
            "Sumber air bersih dimasak matang, rajin cuci tangan pakai sabun.",
            "Tinggal bersama nenek karena orang tua bekerja."
          ];
        default:
          return [];
      }
    }

    const area = activeQ.focus_area.toUpperCase();

    if (area.includes('EVALUASI') || area.includes('LALU')) {
      return [
        "Rekomendasi bulan lalu sudah dijalankan dengan rutin dan ada progres baik.",
        "Sudah dijalankan sebagian, namun ada beberapa kendala penerapan.",
        "Belum sempat dijalankan karena anak sempat sakit atau alasan lain.",
        "Tidak ada perubahan atau kendala, kondisi anak masih stagnan."
      ];
    }
    
    if (area.includes('GIZI') || area.includes('NUTRISI') || area.includes('MPASI')) {
      return [
        "Makan 3x sehari lauk telur/ikan/daging secara teratur.",
        "Nafsu makan berkurang, lebih suka camilan/susu saja.",
        "Kesulitan memberikan protein hewani (anak menolak atau jarang ada).",
        "Porsi makan sedikit (hanya 1-2 sendok makan per sesi)."
      ];
    }
    
    if (area.includes('PENYAKIT') || area.includes('INFEKSI') || area.includes('SAKIT') || area.includes('KESEHATAN')) {
      return [
        "Anak sehat, tidak ada riwayat demam, batuk, pilek, atau diare baru-baru ini.",
        "Sempat batuk-pilek ringan 2-3 hari, tetapi nafsu makan tetap baik.",
        "Sempat demam/diare dalam 2 minggu ini, nafsu makan menurun drastis.",
        "Imunisasi dasar lengkap, saat ini sedang dalam kondisi sehat."
      ];
    }
    
    if (area.includes('PENGASUHAN') || area.includes('RULES') || area.includes('ASUH') || area.includes('PERILAKU')) {
      return [
        "Disuapi ibu secara tenang tanpa nonton HP/jalan-jalan.",
        "Sering GTM (Gerakan Tutup Mulut), melepeh, atau mengemut makanan.",
        "Jadwal makan tidak teratur, sering diberikan susu/camilan di sela jam makan.",
        "Anak aktif disuapi secara responsif, tidak dipaksa."
      ];
    }
    
    if (area.includes('SANITASI') || area.includes('BERSIH') || area.includes('LINGKUNGAN')) {
      return [
        "Menggunakan air galon/rebus mendidih, cuci tangan pakai sabun sebelum makan.",
        "Sumber air sumur, kebersihan lingkungan rumah cukup terjaga.",
        "Akses air bersih terbatas, jarang membiasakan cuci tangan pakai sabun.",
        "Sanitasi rumah baik, jamban keluarga bersih dan sehat."
      ];
    }
    
    if (area.includes('STIMULASI') || area.includes('KEMBANG') || area.includes('TUMBUH')) {
      return [
        "Perkembangan motorik dan bahasa sesuai usia, anak aktif bergerak.",
        "Belum bisa berjalan/merangkak sesuai usianya, butuh stimulasi lebih.",
        "Sering berinteraksi dan diajak bicara oleh orang tua di rumah.",
        "Anak sudah bisa mengucapkan beberapa kata bermakna dengan jelas."
      ];
    }

    return [
      "Sudah berjalan baik sesuai anjuran.",
      "Masih ada kendala/penolakan dari anak.",
      "Kondisi anak sehat dan aktif bermain.",
      "Tidak ada masalah khusus saat ini."
    ];
  };

  const handleHeaderBack = () => {
    if (stage === 'interview' && currentStep > 1) {
      handlePrevStep();
    } else {
      router.back();
    }
  };

  const handleQuickReplyPress = (reply: string) => {
    if (currentStep === 4) {
      setCatatanKader(reply);
    } else {
      setCurrentAnswer(reply);
    }
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'loading-data':
      case 'generating-questions':
      case 'generating-recommendations':
        return (
          <View style={styles.centerContainer}>
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="large" color="#09A477" />
              <View style={styles.spinnerPulse}>
                <Sparkles size={24} color="#09A477" />
              </View>
            </View>
            <Text style={styles.loadingTitle}>Proses Kecerdasan Gizi AI</Text>
            <Text style={styles.loadingDesc}>{loadingText}</Text>
          </View>
        );

      case 'interview': {
        const quickReplies = getQuickReplies(currentStep, activeQuestion);
        const isStep4 = currentStep === 4;

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Minimalist Profile Header */}
            <View style={styles.chatProfileHeader}>
              <View style={styles.chatProfileAvatar}>
                <Text style={styles.chatProfileAvatarText}>
                  {balita?.nama ? balita.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'B'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatProfileName}>{balita?.nama}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={styles.chatProfileSub}>
                    {balita?.jenis_kelamin} • {calculateAgeMonths(balita?.tanggal_lahir || '', todayStr)} bln
                  </Text>
                  {renderTrendBadgeMini(calculatedTrend)}
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.toggleKmsBtn, showKmsChart && styles.toggleKmsBtnActive]}
                onPress={() => setShowKmsChart(!showKmsChart)}
              >
                <Text style={[styles.toggleKmsBtnText, showKmsChart && styles.toggleKmsBtnTextActive]}>
                  {showKmsChart ? 'Tutup KMS' : 'Lihat KMS'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Growth Chart */}
            {showKmsChart && balita && (
              <View style={styles.collapsibleKmsContainer}>
                <View style={styles.chartSelectorRow}>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'BB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('BB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB' && styles.chartSelectorTabTextActive]}>BB/U</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'TB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('TB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'TB' && styles.chartSelectorTabTextActive]}>TB/U</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'BB_TB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('BB_TB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB_TB' && styles.chartSelectorTabTextActive]}>BB/TB</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.counselingChartWrapper}>
                  <GrowthChart
                    standards={chartIndicator === 'BB' ? whoBB : chartIndicator === 'TB' ? whoTB : whoBBTB}
                    data={balitaPenimbangans}
                    indicator={chartIndicator === 'BB' ? 'BB' : chartIndicator === 'TB' ? 'TB' : 'BB_TB'}
                    title={
                      chartIndicator === 'BB'
                        ? 'Berat Badan menurut Umur (BB/U)'
                        : chartIndicator === 'TB'
                        ? 'Tinggi Badan menurut Umur (TB/U)'
                        : 'Berat Badan menurut Tinggi Badan (BB/TB)'
                    }
                    birthDate={balita.tanggal_lahir}
                    bbLahir={balita.bb_lahir}
                    tbLahir={balita.tb_lahir}
                  />
                </View>
              </View>
            )}

            {/* Step Indicator Header Line */}
            <View style={styles.stepProgressContainer}>
              <View style={styles.stepIndicatorRow}>
                <Text style={styles.stepIndicatorText}>Langkah {currentStep} dari 4</Text>
                <Text style={styles.stepIndicatorTitle}>{getStepTitle(currentStep)}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(currentStep / 4) * 100}%` }]} />
              </View>
            </View>

            {/* Chat Area */}
            <ScrollView 
              ref={chatScrollRef}
              style={styles.chatScroll} 
              contentContainerStyle={styles.chatContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Welcome Message */}
              <View style={styles.aiBubbleWrapper}>
                <View style={styles.aiBubble}>
                  <View style={styles.aiBubbleHeader}>
                    <Sparkles size={14} color="#09A477" />
                    <Text style={styles.aiBubbleHeaderTitle}>AI Posyandu</Text>
                  </View>
                  <Text style={styles.aiBubbleText}>
                    Halo Kader! Saya AI Posyandu. Mari kita lakukan sesi penyuluhan gizi terpadu untuk {balita?.nama} ({calculateAgeMonths(balita?.tanggal_lahir || '', todayStr)} bulan) hari ini agar dapat memberikan saran kesehatan yang personal dan relevan.
                  </Text>
                </View>
              </View>

              {/* Previous Counseling Note if Cold Start has previous data (Step 1) */}
              {currentStep === 1 && previousSession && (
                <View style={styles.memoryAlert}>
                  <Brain size={18} color="#0F766E" />
                  <Text style={styles.memoryAlertText}>
                    AI mendeteksi memori penyuluhan bulan lalu ({format(new Date(previousSession.tanggal), 'MMMM yyyy', { locale: idLocale })}). Wawancara disesuaikan secara adaptif.
                  </Text>
                </View>
              )}

              {/* Step 1 */}
              <AiChatBubble 
                stepNumber={1}
                title="Nutrisi & MPASI"
                text={questionsHistory[0]?.question || activeQuestion?.question || ''} 
                guidance={questionsHistory[0]?.guidance || activeQuestion?.guidance || ''}
              />
              {qaList.length >= 1 && (
                <UserChatBubble text={qaList[0].answer} />
              )}

              {/* Step 2 */}
              {currentStep >= 2 && (
                <AiChatBubble 
                  stepNumber={2}
                  title="Kesehatan & Infeksi"
                  text={questionsHistory[1]?.question || (currentStep === 2 ? activeQuestion?.question : '') || ''} 
                  guidance={questionsHistory[1]?.guidance || (currentStep === 2 ? activeQuestion?.guidance : '') || ''}
                />
              )}
              {qaList.length >= 2 && (
                <UserChatBubble text={qaList[1].answer} />
              )}

              {/* Step 3 */}
              {currentStep >= 3 && (
                <AiChatBubble 
                  stepNumber={3}
                  title="Pola Asuh & Sanitasi"
                  text={questionsHistory[2]?.question || (currentStep === 3 ? activeQuestion?.question : '') || ''} 
                  guidance={questionsHistory[2]?.guidance || (currentStep === 3 ? activeQuestion?.guidance : '') || ''}
                />
              )}
              {qaList.length >= 3 && (
                <UserChatBubble text={qaList[2].answer} />
              )}

              {/* Step 4 */}
              {currentStep >= 4 && (
                <AiChatBubble 
                  stepNumber={4}
                  title="Catatan Khusus Kader"
                  text="Apakah ada catatan khusus lapangan lainnya yang ingin Anda tambahkan? Misalnya kondisi fisik anak lesu, rambut kusam, masalah keluarga, dll. Silakan ketik langsung di bawah, pilih rekomendasi cepat, atau tekan Kirim/Selesai jika tidak ada."
                  guidance="Panduan Kader: Tuliskan pengamatan penting secara bebas untuk memperkuat analisis dan rekomendasi gizi AI."
                />
              )}
              {catatanKader.trim().length > 0 && currentStep > 4 && (
                <UserChatBubble text={catatanKader} />
              )}

              {/* Inline AI Typing Indicator */}
              {loadingNext && (
                <View style={styles.aiTypingBubble}>
                  <Sparkles size={16} color="#09A477" />
                  <Text style={styles.aiTypingText}>AI sedang merumuskan pertanyaan...</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick Replies chips bar */}
            {quickReplies.length > 0 && (
              <View style={styles.quickRepliesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
                  {quickReplies.map((reply, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.quickReplyChip}
                      onPress={() => handleQuickReplyPress(reply)}
                    >
                      <Text style={styles.quickReplyChipText} numberOfLines={1}>
                        {reply}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Chat Box */}
            <View style={styles.chatInputContainer}>
              <View style={styles.chatInputWrapper}>
                <TextInput
                  style={[styles.chatTextInput, { maxHeight: 80 }]}
                  placeholder={
                    isStep4 
                      ? "Tulis catatan khusus kader..." 
                      : `Tulis jawaban langkah ${currentStep}...`
                  }
                  value={isStep4 ? catatanKader : currentAnswer}
                  onChangeText={isStep4 ? setCatatanKader : setCurrentAnswer}
                  multiline
                />
                <TouchableOpacity 
                  style={[
                    styles.chatSendBtn, 
                    ((isStep4 ? catatanKader : currentAnswer).trim().length === 0 && !isStep4) && styles.chatSendBtnDisabled
                  ]}
                  onPress={handleNextStep}
                >
                  {isStep4 ? (
                    <CheckCircle2 size={20} color="#FFF" />
                  ) : (
                    <Send size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        );
      }

      case 'success': {
        const chipColors = [
          { bg: '#F0FDFA', text: '#09A477', label: 'Nutrisi' }, 
          { bg: '#FFFBEB', text: '#D97706', label: 'Kesehatan' }, 
          { bg: '#FCE7F3', text: '#DB2777', label: 'Pola Asuh' }
        ];

        return (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.successHeader}>
              <CheckCircle2 size={56} color="#09A477" />
              <Text style={styles.successTitle}>Penyuluhan AI Selesai!</Text>
              <Text style={styles.successDesc}>Rekomendasi gizi personal berhasil dirumuskan oleh kecerdasan buatan.</Text>
            </View>

            {/* Ringkasan Hasil AI Card */}
            <View style={styles.ringkasanHasilCard}>
              <View style={styles.ringkasanHasilHeader}>
                <Brain size={20} color="#FFFFFF" />
                <Text style={styles.ringkasanHasilTitle}>Ringkasan Hasil Tanya Jawab</Text>
              </View>
              
              <View style={styles.summaryList}>
                {qaList.map((item, index) => {
                  const theme = chipColors[index % chipColors.length];
                  return (
                    <View key={index} style={styles.summaryItemRow}>
                      <View style={[styles.summaryIconCircle, { backgroundColor: theme.bg }]}>
                        <Text style={[styles.summaryIconText, { color: theme.text }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.summaryTextContent}>
                        <Text style={[styles.summaryLabel, { color: theme.text }]}>{theme.label}</Text>
                        <Text style={styles.summaryQuestionText}>{item.question}</Text>
                        <Text style={styles.summaryAnswerText}>"{item.answer}"</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Catatan Tambahan Kader */}
              {catatanKader.trim().length > 0 && (
                <View style={styles.kaderNotesCard}>
                  <Text style={styles.kaderNotesTitle}>Catatan Khusus Kader:</Text>
                  <Text style={styles.kaderNotesText}>"{catatanKader}"</Text>
                </View>
              )}
            </View>

            {/* Glassmorphic AI Recommendation Card */}
            <Card style={styles.premiumAdviceCard}>
              <View style={styles.adviceCardHeader}>
                <Sparkles size={22} color="#09A477" />
                <Text style={styles.adviceCardTitle}>Rekomendasi Gizi & Stimulasi</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.adviceMarkdown}>{aiRecommendation}</Text>
            </Card>

            {/* Actions */}
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
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      {stage !== 'loading-data' && stage !== 'generating-questions' && stage !== 'generating-recommendations' && (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={handleHeaderBack} style={styles.backBtn}>
              <ArrowLeft size={24} color="#1E293B" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Penyuluhan AI</Text>
            </View>
          </View>
          {stage === 'interview' && (
            <TouchableOpacity 
              style={styles.trashBtn} 
              onPress={() => {
                Alert.alert(
                  'Batalkan Sesi',
                  'Apakah Anda yakin ingin membatalkan dan mengulang sesi penyuluhan gizi ini?',
                  [
                    { text: 'Tidak', style: 'cancel' },
                    { text: 'Ya, Ulangi', onPress: () => router.back(), style: 'destructive' }
                  ]
                );
              }}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderStageContent()}
    </SafeAreaView>
  );
}

// Sub components for Chat
const AiChatBubble = ({ stepNumber, title, text, guidance }: { stepNumber: number; title: string; text: string; guidance?: string }) => {
  return (
    <View style={styles.aiBubbleWrapper}>
      <View style={styles.aiBubble}>
        <View style={styles.aiBubbleHeader}>
          <Sparkles size={14} color="#09A477" />
          <Text style={styles.aiBubbleHeaderTitle}>AI Posyandu</Text>
          <View style={{ flex: 1 }} />
          <View style={styles.aiBubbleBadge}>
            <Text style={styles.aiBubbleBadgeText}>Langkah {stepNumber}: {title}</Text>
          </View>
        </View>
        <Text style={styles.aiBubbleText}>{text}</Text>
        {guidance ? (
          <View style={styles.aiGuidanceBox}>
            <Text style={styles.aiGuidanceTitle}>💡 Panduan Wawancara Kader:</Text>
            <Text style={styles.aiGuidanceText}>{guidance}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const UserChatBubble = ({ text }: { text: string }) => {
  const timeStr = format(new Date(), 'HH:mm');
  return (
    <View style={styles.userBubbleWrapper}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleSender}>Anda</Text>
        <Text style={styles.userBubbleText}>{text}</Text>
        <View style={styles.userBubbleFooter}>
          <Text style={styles.userBubbleTime}>{timeStr}</Text>
          <Text style={styles.userBubbleTicks}>✓✓</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
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
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
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
  
  // MINIMALIST CHAT PROFILE HEADER
  chatProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatProfileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatProfileAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#09A477',
  },
  chatProfileName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  chatProfileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chatProfileZscores: {
    flexDirection: 'row',
    gap: 6,
  },
  zBadgeMini: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  zBadgeLabelMini: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
  },
  zBadgeValMini: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 1,
  },

  // PROGRESS TRACKER
  stepProgressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#09A477',
    textTransform: 'uppercase',
  },
  stepIndicatorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#09A477',
    borderRadius: 2,
  },

  // CHAT SCROLLVIEW
  chatScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatContentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  memoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  memoryAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
    lineHeight: 18,
  },

  // BUBBLES
  aiBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  aiBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiBubbleHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#09A477',
  },
  aiBubbleBadge: {
    backgroundColor: '#F0FDFA',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBubbleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#09A477',
  },
  aiBubbleText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    fontWeight: '500',
  },
  aiGuidanceBox: {
    marginTop: 10,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#09A477',
  },
  aiGuidanceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 2,
  },
  aiGuidanceText: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 16,
  },

  userBubbleWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  userBubble: {
    backgroundColor: '#E6F4EA',
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userBubbleSender: {
    fontSize: 10,
    fontWeight: '800',
    color: '#09A477',
    marginBottom: 2,
  },
  userBubbleText: {
    fontSize: 14,
    color: '#0F766E',
    lineHeight: 20,
    fontWeight: '500',
  },
  userBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  userBubbleTime: {
    fontSize: 9,
    color: '#09A477',
    fontWeight: '600',
  },
  userBubbleTicks: {
    fontSize: 10,
    color: '#09A477',
    fontWeight: '800',
  },
  trashBtn: {
    padding: 8,
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },

  // INLINE AI TYPING INDICATOR
  aiTypingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 42,
    marginBottom: 20,
    gap: 6,
  },
  aiTypingText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },

  // QUICK REPLIES BAR
  quickRepliesContainer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickRepliesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: 240,
  },
  quickReplyChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },

  // CHAT INPUT BAR
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  chatTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#09A477',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  chatSendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },

  // SUCCESS LAYOUT
  successHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  successDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '500',
  },

  // RINGKASAN HASIL CARD
  ringkasanHasilCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  ringkasanHasilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09A477',
    padding: 16,
    gap: 10,
  },
  ringkasanHasilTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryList: {
    padding: 20,
    gap: 16,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  summaryIconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryTextContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryQuestionText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAnswerText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  kaderNotesCard: {
    backgroundColor: '#F0FDFA',
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
    padding: 16,
  },
  kaderNotesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 4,
  },
  kaderNotesText: {
    fontSize: 13,
    color: '#134E4A',
    lineHeight: 18,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // PREMIUM ADVICE
  premiumAdviceCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 24,
    borderRadius: 28,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#09A477',
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
    fontWeight: 'bold',
    color: '#0F766E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  trendBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendBadgeMiniText: {
    fontSize: 9,
    fontWeight: '800',
  },
  toggleKmsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  toggleKmsBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  toggleKmsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  toggleKmsBtnTextActive: {
    color: '#FFFFFF',
  },
  collapsibleKmsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  counselingChartWrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chartSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  chartSelectorTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  chartSelectorTabActive: {
    backgroundColor: '#09A477',
  },
  chartSelectorTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chartSelectorTabTextActive: {
    color: '#FFFFFF',
  },
});
