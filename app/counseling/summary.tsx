// app/counseling/summary.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  FileText,
  UtensilsCrossed,
  Heart,
  Users,
  ThumbsUp,
  Smile,
  BookOpen,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { WhatsAppService } from '../../services/whatsapp-service';

interface CounselingRecord {
  id: string;
  tanggal: string;
  created_at: string;
  pertanyaan: string[];
  jawaban: string[];
  rekomendasi: string;
  balita: {
    id: string;
    nama: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    rt: number;
    no_hp_ortu?: string | null;
  };
  penimbangan?: {
    tanggal?: string;
    berat_badan: number;
    tinggi_badan: number;
    lingkar_kepala?: number | null;
    lingkar_lengan?: number | null;
    zscore_bb_u?: number | null;
    status_bb_u?: string | null;
    zscore_tb_u?: number | null;
    status_tb_u?: string | null;
    zscore_bb_tb?: number | null;
    status_bb_tb?: string | null;
  };
  posyandu?: {
    nama_posyandu: string;
  };
}

export default function CounselingSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<CounselingRecord | null>(null);

  useEffect(() => {
    if (id) {
      fetchRecord();
    }
  }, [id]);

  const fetchRecord = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('penyuluhans')
        .select(`
          id,
          tanggal,
          created_at,
          pertanyaan,
          jawaban,
          rekomendasi,
          balita:balitas(
            id,
            nama,
            tanggal_lahir,
            jenis_kelamin,
            rt,
            no_hp_ortu,
            posyandu:posyandus(nama_posyandu)
          ),
          penimbangan:penimbangans(
            tanggal,
            berat_badan,
            tinggi_badan,
            lingkar_kepala,
            lingkar_lengan,
            zscore_bb_u,
            status_bb_u,
            zscore_tb_u,
            status_tb_u,
            zscore_bb_tb,
            status_bb_tb
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const rawData = data as any;
      const balitaObj = Array.isArray(rawData.balita) ? rawData.balita[0] : rawData.balita;
      const penimbanganObj = Array.isArray(rawData.penimbangan) ? rawData.penimbangan[0] : rawData.penimbangan;
      const posyanduObj = Array.isArray(balitaObj?.posyandu) ? balitaObj.posyandu[0] : balitaObj?.posyandu;

      const mappedRecord: CounselingRecord = {
        id: rawData.id,
        tanggal: rawData.tanggal,
        created_at: rawData.created_at,
        pertanyaan: rawData.pertanyaan || [],
        jawaban: rawData.jawaban || [],
        rekomendasi: rawData.rekomendasi || '',
        balita: balitaObj,
        penimbangan: penimbanganObj,
        posyandu: posyanduObj,
      };

      setRecord(mappedRecord);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat ringkasan penyuluhan.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!record) return;
    try {
      const shareMsg = `Ringkasan Penyuluhan AI - Balita: ${record.balita.nama}\n` +
        `Tanggal: ${formatItemDate(record.tanggal || record.created_at)}\n\n` +
        `Rekomendasi:\n${record.rekomendasi}`;
      await Share.share({ message: shareMsg });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!record) return;

    // Build penimbangan structure matching WhatsAppService requirements
    const pData = record.penimbangan ? {
      tanggal: record.penimbangan.tanggal || record.tanggal || record.created_at,
      berat_badan: record.penimbangan.berat_badan,
      tinggi_badan: record.penimbangan.tinggi_badan,
      lingkar_kepala: record.penimbangan.lingkar_kepala || null,
      lingkar_lengan: record.penimbangan.lingkar_lengan || null,
      zscore_bb_u: record.penimbangan.zscore_bb_u || null,
      status_bb_u: record.penimbangan.status_bb_u || null,
      zscore_tb_u: record.penimbangan.zscore_tb_u || null,
      status_tb_u: record.penimbangan.status_tb_u || null,
      zscore_bb_tb: record.penimbangan.zscore_bb_tb || null,
      status_bb_tb: record.penimbangan.status_bb_tb || null,
    } : null;

    const message = WhatsAppService.generateHasilUnified(
      record.balita as any,
      pData as any,
      record.rekomendasi,
      record.posyandu as any
    );

    if (record.balita.no_hp_ortu) {
      await WhatsAppService.openWhatsApp(record.balita.no_hp_ortu, message);
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

  const parseRecommendation = (markdown: string) => {
    const lines = markdown.split('\n');
    const points: { title: string; desc: string }[] = [];
    let extraNotes = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Match pattern: "1. **Title**: Description" or "1. Title: Description"
      const match = trimmed.match(/^(?:\d+\.|\-|\*)\s*(?:\*\*(.*?)\*\*|\*(.*?)\*|(.*?))\s*:\s*(.*)$/);
      if (match) {
        const title = match[1] || match[2] || match[3] || '';
        const desc = match[4] || '';
        points.push({ title: title.trim(), desc: desc.trim() });
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        // Fallback split by double stars
        const cleanLine = trimmed.replace(/^(?:\d+\.|\-|\*)\s*/, '');
        const parts = cleanLine.split('**');
        if (parts.length >= 3) {
          const title = parts[1];
          const desc = parts.slice(2).join('**').replace(/^:\s*/, '');
          points.push({ title: title.trim(), desc: desc.trim() });
        } else {
          const colonIndex = cleanLine.indexOf(':');
          if (colonIndex > -1) {
            const title = cleanLine.substring(0, colonIndex);
            const desc = cleanLine.substring(colonIndex + 1);
            points.push({ title: title.trim(), desc: desc.trim() });
          } else {
            points.push({ title: 'Rekomendasi', desc: cleanLine.trim() });
          }
        }
      } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        extraNotes += (extraNotes ? '\n' : '') + trimmed;
      }
    });

    return { points, extraNotes };
  };

  const formatItemDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'd MMMM yyyy', { locale: idLocale });
  };

  const formatItemTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#09A477" />
        <Text style={styles.loadingText}>Memuat ringkasan...</Text>
      </View>
    );
  }

  if (!record) return null;

  const { points, extraNotes } = parseRecommendation(record.rekomendasi);
  const time = formatItemTime(record.created_at);
  const dateLabel = formatItemDate(record.tanggal || record.created_at);

  const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];
  const icons = [UtensilsCrossed, Heart, Users, ThumbsUp, Smile];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ringkasan Penyuluhan</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Share2 size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconCircle}>
            <FileText size={24} color="#09A477" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Ringkasan Saran AI</Text>
            <Text style={styles.bannerSubtitle}>
              Berikut ringkasan saran untuk pertanyaan Anda pada {dateLabel}, {time} WIB
            </Text>
          </View>
        </View>

        {/* Section: Pertanyaan Anda */}
        <Text style={styles.sectionTitle}>Pertanyaan Anda</Text>
        <Card style={styles.qaCard}>
          {record.pertanyaan.length > 0 ? (
            record.pertanyaan.map((q, idx) => {
              const a = record.jawaban[idx] || 'Tidak dijawab.';
              // Clean questions of balita name or make it look conversational
              const cleanQ = q.replace(/Selamat pagi Ibu, saya ingin tahu lebih tentang pola makan .*?\./, 'Bagaimana pola makan anak Anda saat ini?')
                .replace(/Ibu, dalam dua minggu terakhir, apakah .*? pernah mengalami/, 'Apakah anak pernah mengalami')
                .replace(/Ibu, siapa yang biasanya menyuapi .*? saat makan, dan bagaimana perilaku/, 'Siapa yang menyuapi dan bagaimana perilaku');

              return (
                <View key={idx} style={styles.qaItem}>
                  <Text style={styles.qaQuestion}>Q: {cleanQ}</Text>
                  <Text style={styles.qaAnswer}>A: "{a}"</Text>
                  {idx < record.pertanyaan.length - 1 && <View style={styles.qaDivider} />}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Tidak ada data pertanyaan.</Text>
          )}
        </Card>

        {/* Section: Ringkasan Jawaban */}
        <Text style={styles.sectionTitle}>Ringkasan Jawaban</Text>
        <Card style={styles.recommendationsCard}>
          {points.length > 0 ? (
            points.map((p, idx) => {
              const ItemIcon = icons[idx % icons.length];
              const color = colors[idx % colors.length];
              const bg = color + '15'; // 15% opacity

              return (
                <View key={idx} style={styles.recItemRow}>
                  <View style={[styles.recIconCircle, { backgroundColor: bg }]}>
                    <ItemIcon size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recItemTitle}>{p.title}</Text>
                    <Text style={styles.recItemDesc}>{p.desc}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.recItemRow}>
              <View style={[styles.recIconCircle, { backgroundColor: '#E6F4EA' }]}>
                <BookOpen size={20} color="#09A477" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recItemTitle}>Rekomendasi AI</Text>
                <Text style={styles.recItemDesc}>{record.rekomendasi}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Section: Catatan Tambahan */}
        {extraNotes.trim().length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Catatan Tambahan</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{extraNotes.trim()}</Text>
            </View>
          </>
        )}

        {/* Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleShareWhatsApp}>
          <Text style={styles.primaryBtnText}>Bagikan via WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryBtn} 
          onPress={() => router.replace('/counseling/queue')}
        >
          <Text style={styles.secondaryBtnText}>Simpan Ringkasan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  shareBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09A477',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 12,
    paddingLeft: 4,
  },
  qaCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  qaItem: {
    paddingVertical: 4,
  },
  qaQuestion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  qaAnswer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
    fontStyle: 'italic',
  },
  qaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  recommendationsCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    gap: 16,
  },
  recItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  recItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  recItemDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 2,
  },
  notesCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  notesText: {
    fontSize: 13,
    color: '#0D9488',
    lineHeight: 20,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#09A477',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#09A477',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  secondaryBtnText: {
    color: '#09A477',
    fontSize: 15,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
