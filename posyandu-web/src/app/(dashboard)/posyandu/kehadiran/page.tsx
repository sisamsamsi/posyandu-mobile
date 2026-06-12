'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Calendar } from 'lucide-react';
import SubmenuPlaceholder, { ActionItem, StatItem } from '@/components/layout/SubmenuPlaceholder';
import AIInsightBox from '@/components/ui/AIInsightBox';

interface KehadiranData {
  id: string;
  nama_posyandu: string;
  kelurahan: string;
  hadir_balita: number;
  total_balita: number;
  hadir_lansia: number;
  total_lansia: number;
  persentase: number;
  status: string;
}

export default function KehadiranPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<KehadiranData[]>([]);
  const [activeCategory, setActiveCategory] = useState<'balita' | 'lansia'>('balita');
  const [selectedMonth, setSelectedMonth] = useState('6'); // Default: Juni (1-indexed)
  const [selectedYear, setSelectedYear] = useState('2026');
  const [loading, setLoading] = useState(true);

  // Set current month/year dynamically on mount to prevent stale defaults
  useEffect(() => {
    const today = new Date();
    setSelectedMonth((today.getMonth() + 1).toString());
    setSelectedYear(today.getFullYear().toString());
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const monthsList = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const calculateAgeMonths = (dobStr: string, refDate: Date) => {
    const dob = new Date(dobStr);
    let months = (refDate.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += refDate.getMonth();
    return months <= 0 ? 0 : months;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const yearNum = parseInt(selectedYear);
        const monthNum = parseInt(selectedMonth);

        // Date bounds for measurements
        const startDay = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        const endDay = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const refDate = new Date(yearNum, monthNum - 1, 1);

        // Query posyandus to generate attendance report
        const { data: posyandus, error: pError } = await supabase
          .from('posyandus')
          .select('id, nama_posyandu, kelurahan');

        if (pError) throw pError;

        // Query total balitas per posyandu (including tanggal_lahir to filter < 60 months)
        const { data: balitas, error: bError } = await supabase
          .from('balitas')
          .select('id, posyandu_id, tanggal_lahir');
        if (bError) throw bError;

        // Query total lansias per posyandu
        const { data: lansias, error: lError } = await supabase
          .from('lansias')
          .select('id, posyandu_id');
        if (lError) throw lError;

        // Fetch measurements (penimbangans) in the selected month
        const { data: weighs, error: wError } = await supabase
          .from('penimbangans')
          .select('balita_id, tanggal')
          .gte('tanggal', startDay)
          .lte('tanggal', endDay);
        if (wError) throw wError;

        // Fetch checkups (pemeriksaan_lansias) in the selected month
        const { data: checks, error: cError } = await supabase
          .from('pemeriksaan_lansias')
          .select('lansia_id, tanggal_periksa')
          .gte('tanggal_periksa', startDay)
          .lte('tanggal_periksa', endDay);
        if (cError) throw cError;

        // Create sets of unique IDs who have records on the selected month
        const weighSet = new Set((weighs || []).map(w => w.balita_id));
        const checkSet = new Set((checks || []).map(c => c.lansia_id));

        // Filter out balitas aged >= 60 months on selected period
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir, refDate) < 60);

        // Map and calculate stats
        const report: KehadiranData[] = (posyandus || []).map(p => {
          const listB = activeBalitas.filter(b => b.posyandu_id === p.id);
          const listL = (lansias || []).filter(l => l.posyandu_id === p.id);
          
          // Calculate actual counts using Set checkups
          const hadirB = listB.filter(b => weighSet.has(b.id)).length;
          const hadirL = listL.filter(l => checkSet.has(l.id)).length;
          
          const total = activeCategory === 'balita' ? listB.length : listL.length;
          const hadir = activeCategory === 'balita' ? hadirB : hadirL;
          const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
          
          let status = 'Sangat Baik';
          if (pct < 60) status = 'Perlu Perhatian';
          else if (pct < 80) status = 'Cukup';

          return {
            id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            hadir_balita: hadirB,
            total_balita: listB.length,
            hadir_lansia: hadirL,
            total_lansia: listL.length,
            persentase: pct,
            status
          };
        });

        // Apply filters
        let filtered = report;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(item => item.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(item => item.id === selectedPosyanduId);
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching attendance data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, activeCategory, selectedMonth, selectedYear, filtersLoading]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Total Posyandu', value: data.length, color: 'neutral' },
    { label: 'Kehadiran Baik (≥80%)', value: data.filter(d => d.persentase >= 80).length, color: 'success' },
    { label: 'Cukup (60–79%)', value: data.filter(d => d.persentase >= 60 && d.persentase < 80).length, color: 'warning' },
    { label: 'Perlu Perhatian (<60%)', value: data.filter(d => d.persentase < 60).length, color: 'danger' },
  ], [data]);

  const actionItems = useMemo((): ActionItem[] | undefined => {
    if (data.length === 0) return undefined;
    return [...data]
      .sort((a, b) => a.persentase - b.persentase)
      .slice(0, 3)
      .map(d => {
        const total = activeCategory === 'balita' ? d.total_balita : d.total_lansia;
        const hadir = activeCategory === 'balita' ? d.hadir_balita : d.hadir_lansia;
        return {
          nama: `${d.nama_posyandu} — ${d.kelurahan}`,
          keterangan: `${hadir}/${total} peserta (${d.persentase}%)`,
          urgensi: d.persentase < 60 ? 'tinggi' as const : 'sedang' as const,
        };
      });
  }, [data, activeCategory]);

  const insightData = useMemo(() => {
    if (data.length === 0) return {};
    const total = data.reduce((acc, curr) => acc + (activeCategory === 'balita' ? curr.total_balita : curr.total_lansia), 0);
    const hadir = data.reduce((acc, curr) => acc + (activeCategory === 'balita' ? curr.hadir_balita : curr.hadir_lansia), 0);
    const baik = data.filter(d => d.persentase >= 80).length;
    const perhatian = data.filter(d => d.persentase < 60).length;

    return {
      kategori: activeCategory === 'balita' ? 'Balita' : 'Lansia',
      total_sasaran_wilayah: total,
      total_hadir_wilayah: hadir,
      rata_rata_kehadiran: total > 0 ? `${Math.round((hadir / total) * 100)}%` : '0%',
      posyandu_kehadiran_baik: baik,
      posyandu_perlu_perhatian: perhatian
    };
  }, [data, activeCategory]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Kehadiran & Pelaporan"
      parentTitle="Posyandu"
      icon={Calendar}
      loading={loading}
      stats={stats}
      sectionTitle="Rekap Kehadiran per Posyandu"
      actionItems={actionItems}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat data kehadiran posyandu...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data posyandu ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* CATEGORY SWITCH & MONTH/YEAR FILTER */}
          <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div className="toggle-switch-container">
              <button 
                className={`toggle-btn ${activeCategory === 'balita' ? 'active' : ''}`}
                onClick={() => setActiveCategory('balita')}
              >
                BALITA
              </button>
              <button 
                className={`toggle-btn ${activeCategory === 'lansia' ? 'active' : ''}`}
                onClick={() => setActiveCategory('lansia')}
              >
                LANSIA
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                className="header-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ minWidth: '120px' }}
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select 
                className="header-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ minWidth: '90px' }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* AI INSIGHT BOX */}
          <AIInsightBox
            konteks={`Kehadiran Posyandu (${activeCategory === 'balita' ? 'Balita' : 'Lansia'})`}
            bulan={monthsList.find(m => m.value === selectedMonth)?.label + ' ' + selectedYear}
            filter={selectedDesa === 'all' ? 'Semua Kalurahan' : `Kalurahan ${selectedDesa}`}
            data={insightData}
          />

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Kelurahan/Desa</th>
                  {activeCategory === 'balita' ? <th>Kehadiran Balita</th> : <th>Kehadiran Lansia</th>}
                  <th>Tingkat Kehadiran</th>
                  <th>Status Partisipasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td>
                      {activeCategory === 'balita' 
                        ? `${item.hadir_balita} / ${item.total_balita} Anak`
                        : `${item.hadir_lansia} / ${item.total_lansia} Lansia`}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {item.persentase}%
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.status === 'Sangat Baik' 
                            ? 'badge-success' 
                            : item.status === 'Cukup' 
                            ? 'badge-info' 
                            : 'badge-warning'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-container">
              <span>Menampilkan {startIndex + 1}-{endIndex} dari {data.length} data</span>
              <div className="pagination-pages">
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SubmenuPlaceholder>
  );
}

