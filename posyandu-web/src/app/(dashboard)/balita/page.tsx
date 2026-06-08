'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Eye, Edit, Trash2, Baby, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Balita {
  id: string;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  posyandu_id: string | null;
  nama_ortu: string;
  posyandu?: { nama_posyandu: string; nama_posyandu_balita: string | null; kelurahan: string };
  // Latest weight & height
  penimbangans?: Array<{
    berat_badan: number;
    tinggi_badan: number;
    status_bb_u: string | null;
    zscore_bb_u: number | null;
    status_tb_u: string | null;
    zscore_tb_u: number | null;
    status_bb_tb: string | null;
    zscore_bb_tb: number | null;
  }>;
}

export default function BalitaPage() {
  const router = useRouter();
  const { selectedDesa, selectedPosyanduId, posyanduList, loading: filtersLoading } = useFilters();

  // Calculate age in months
  const calculateAgeMonths = (dobStr: string) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let months = (today.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
  };
  
  // Data States
  const [balitas, setBalitas] = useState<Balita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState<'aktif' | 'lulus'>('aktif');
  
  // Form States
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-laki');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [anakKe, setAnakKe] = useState('1');
  const [namaOrtu, setNamaOrtu] = useState('');
  const [noHpOrtu, setNoHpOrtu] = useState('');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState('1');
  const [bbLahir, setBbLahir] = useState('');
  const [tbLahir, setTbLahir] = useState('');
  const [posyanduId, setPosyanduId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch Balitas
  const fetchBalitas = async () => {
    try {
      setLoading(true);
      // Fetch balitas joined with posyandu details and latest weighings
      let query = supabase
        .from('balitas')
        .select(`
          id, nik, nama, jenis_kelamin, tanggal_lahir, anak_ke, nama_ortu, no_hp_ortu, alamat, rt, posyandu_id, bb_lahir, tb_lahir,
          posyandu:posyandus(nama_posyandu, nama_posyandu_balita, kelurahan),
          penimbangans(berat_badan, tinggi_badan, status_bb_u, zscore_bb_u, status_tb_u, zscore_tb_u, status_bb_tb, zscore_bb_tb)
        `);

      const { data, error } = await query.order('nama', { ascending: true });
      if (error) throw error;

      let filtered = (data || []) as any as Balita[];

      // Filter by global Desa/Kalurahan context
      if (selectedDesa !== 'all') {
        filtered = filtered.filter(b => b.posyandu?.kelurahan === selectedDesa);
      }

      // Filter by global Posyandu context
      if (selectedPosyanduId !== 'all') {
        filtered = filtered.filter(b => b.posyandu_id === selectedPosyanduId);
      }

      // Sort weighings inside each balita to get the latest one
      filtered.forEach(b => {
        if (b.penimbangans && b.penimbangans.length > 0) {
          b.penimbangans = [b.penimbangans[b.penimbangans.length - 1]];
        }
      });

      setBalitas(filtered as any[]);
    } catch (err: any) {
      console.error('Error loading balitas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoading) {
      fetchBalitas();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const editParam = searchParams.get('edit');
    if (editParam && balitas.length > 0) {
      const match = balitas.find(b => b.id === editParam);
      if (match) {
        handleOpenEditModal(match);
        router.replace('/balita');
      }
    }
  }, [balitas]);

  // Handle Search & Filter in UI
  const filteredData = balitas.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      b.nama.toLowerCase().includes(q) ||
      b.nik.includes(q) ||
      (b.posyandu?.nama_posyandu_balita || b.posyandu?.nama_posyandu || '').toLowerCase().includes(q)
    );

    if (!matchesSearch) return false;

    const age = calculateAgeMonths(b.tanggal_lahir);
    if (statusFilter === 'aktif') {
      return age < 60;
    } else {
      return age >= 60;
    }
  });

  // Reset to page 1 when filters, search terms, or status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDesa, selectedPosyanduId, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show around current page
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        i === currentPage - delta - 1 || 
        i === currentPage + delta + 1
      ) {
        pages.push('...');
      }
    }
    
    return pages.filter((page, index, self) => {
      return page !== '...' || self[index - 1] !== '...';
    });
  };

  const handleOpenModal = () => {
    setEditId(null);
    setNik('');
    setNama('');
    setJenisKelamin('Laki-laki');
    setTanggalLahir('');
    setAnakKe('1');
    setNamaOrtu('');
    setNoHpOrtu('628');
    setAlamat('');
    setRt('1');
    setBbLahir('');
    setTbLahir('');
    setFormError('');
    // Default to the first posyandu in list if available
    setPosyanduId(posyanduList.length > 0 ? posyanduList[0].id : '');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (b: any) => {
    setEditId(b.id);
    setNik(b.nik || '');
    setNama(b.nama || '');
    setJenisKelamin(b.jenis_kelamin || 'Laki-laki');
    setTanggalLahir(b.tanggal_lahir || '');
    setAnakKe(String(b.anak_ke || '1'));
    setNamaOrtu(b.nama_ortu || '');
    setNoHpOrtu(b.no_hp_ortu || '628');
    setAlamat(b.alamat || '');
    setRt(String(b.rt || '1'));
    setBbLahir(b.bb_lahir ? String(b.bb_lahir) : '');
    setTbLahir(b.tb_lahir ? String(b.tb_lahir) : '');
    setPosyanduId(b.posyandu_id || '');
    setFormError('');
    setShowAddModal(true);
  };

  const handleDeleteBalita = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data balita ${name}? Semua data penimbangan dan imunisasi anak ini juga akan terhapus.`)) {
      try {
        setLoading(true);
        // Delete dependent records first to safeguard database integrity
        await supabase.from('penimbangans').delete().eq('balita_id', id);
        await supabase.from('imunisasi').delete().eq('balita_id', id);
        const { error } = await supabase.from('balitas').delete().eq('id', id);
        if (error) throw error;
        fetchBalitas();
      } catch (err: any) {
        alert('Gagal menghapus balita: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddBalita = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (nik.length !== 16 || isNaN(Number(nik))) {
      setFormError('NIK wajib berisi 16 digit angka.');
      return;
    }

    if (!posyanduId) {
      setFormError('Silakan pilih Unit Posyandu untuk balita ini.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. If not editing, check if NIK already exists
      if (!editId) {
        const { data: existing } = await supabase
          .from('balitas')
          .select('id, nama, posyandus(nama_posyandu, nama_posyandu_balita)')
          .eq('nik', nik)
          .maybeSingle();

        if (existing) {
          throw new Error(`Balita dengan NIK ini sudah terdaftar atas nama ${existing.nama} di ${(existing as any).posyandus?.nama_posyandu_balita || (existing as any).posyandus?.nama_posyandu || 'Posyandu'}`);
        }
      }

      const payload = {
        nik,
        nama: nama.trim(),
        jenis_kelamin: jenisKelamin as any,
        tanggal_lahir: tanggalLahir,
        anak_ke: parseInt(anakKe) || 1,
        nama_ortu: namaOrtu.trim() || 'Ortu',
        no_hp_ortu: noHpOrtu.trim() || null,
        alamat: alamat.trim(),
        rt: parseInt(rt) || 1,
        posyandu_id: posyanduId,
        bb_lahir: bbLahir ? parseFloat(bbLahir) : null,
        tb_lahir: tbLahir ? parseFloat(tbLahir) : null
      };

      if (editId) {
        // 2a. Update balita profile
        const { error: updateError } = await supabase
          .from('balitas')
          .update(payload)
          .eq('id', editId);

        if (updateError) throw updateError;
      } else {
        // 2b. Insert balita profile
        const { data: inserted, error: insertError } = await supabase
          .from('balitas')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;

        // 3. Create immunization placeholder record
        await supabase
          .from('imunisasi')
          .insert([{ balita_id: inserted.id }]);
      }

      setShowAddModal(false);
      fetchBalitas();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data balita.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* 1. SEARCH & FILTERS BAR */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
          {/* Toggle Status Balita */}
          <div className="toggle-switch-container" style={{ margin: 0, height: '34px' }}>
            <button 
              className={`toggle-btn ${statusFilter === 'aktif' ? 'active' : ''}`}
              onClick={() => setStatusFilter('aktif')}
              style={{ fontSize: '11px', padding: '0 12px' }}
            >
              Aktif (&lt; 5 Thn)
            </button>
            <button 
              className={`toggle-btn ${statusFilter === 'lulus' ? 'active' : ''}`}
              onClick={() => setStatusFilter('lulus')}
              style={{ fontSize: '11px', padding: '0 12px' }}
            >
              Lulus (&ge; 5 Thn)
            </button>
          </div>

          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama / NIK / Posyandu..." 
            />
          </div>
        </div>
        <div>
          <button onClick={handleOpenModal} className="btn btn-primary">
            <Plus size={14} />
            <span>Tambah Balita</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN DATA TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Memuat data balita...
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ditemukan data balita yang cocok.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Balita</th>
                <th>JK</th>
                <th>Umur</th>
                <th>Posyandu</th>
                <th>BB (kg)</th>
                <th>TB (cm)</th>
                <th>BB/U</th>
                <th>TB/U</th>
                <th>BB/TB</th>
                <th>Status Gizi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((b, index) => {
                const latestMeas = b.penimbangans?.[0] || null;
                const ageMonths = calculateAgeMonths(b.tanggal_lahir);
                
                // Color mapping for zscore status
                const getStatusBadge = (status: string | null) => {
                  if (!status) return <span style={{ color: '#94a3b8' }}>-</span>;
                  const s = status.toLowerCase();
                  if (s.includes('buruk') || s.includes('sangat pendek') || s.includes('kurang')) {
                    return <span className="badge badge-danger">{status}</span>;
                  }
                  if (s.includes('pendek') || s.includes('wasted') || s.includes('risiko')) {
                    return <span className="badge badge-warning">{status}</span>;
                  }
                  return <span className="badge badge-success">{status}</span>;
                };

                return (
                  <tr key={b.id}>
                    <td>{startIndex + index + 1}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b' }}>{b.nama}</td>
                    <td>{b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td>{ageMonths} bln</td>
                    <td>{b.posyandu?.nama_posyandu_balita || b.posyandu?.nama_posyandu || '-'}</td>
                    <td>{latestMeas ? latestMeas.berat_badan : '-'}</td>
                    <td>{latestMeas ? latestMeas.tinggi_badan : '-'}</td>
                    <td style={{ color: latestMeas?.zscore_bb_u && latestMeas.zscore_bb_u < -2 ? '#ef4444' : 'inherit' }}>
                      {latestMeas?.zscore_bb_u ? latestMeas.zscore_bb_u.toFixed(1) : '-'}
                    </td>
                    <td style={{ color: latestMeas?.zscore_tb_u && latestMeas.zscore_tb_u < -2 ? '#ef4444' : 'inherit' }}>
                      {latestMeas?.zscore_tb_u ? latestMeas.zscore_tb_u.toFixed(1) : '-'}
                    </td>
                    <td style={{ color: latestMeas?.zscore_bb_tb && latestMeas.zscore_bb_tb < -2 ? '#ef4444' : 'inherit' }}>
                      {latestMeas?.zscore_bb_tb ? latestMeas.zscore_bb_tb.toFixed(1) : '-'}
                    </td>
                    <td>{getStatusBadge(latestMeas?.status_bb_u || null)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => router.push(`/balita/${b.id}`)}
                          className="action-btn"
                          title="Lihat Detail Profil & KMS"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(b)}
                          className="action-btn" 
                          title="Ubah Data"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBalita(b.id, b.nama)}
                          className="action-btn" 
                          title="Hapus Data"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pagination-container">
            <span>Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} - {endIndex} dari {filteredData.length} data balita</span>
            <div className="pagination-pages" style={{ display: 'flex', gap: '4px' }}>
              <button 
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="pagination-btn"
                style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span 
                      key={`ellipsis-${index}`} 
                      style={{ padding: '0 4px', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    type="button"
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page as number)}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button 
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="pagination-btn"
                style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="Selanjutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BALITA MODAL */}
      {showAddModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <form 
            onSubmit={handleAddBalita}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                {editId ? `Ubah Profil Balita: ${nama}` : 'Tambah Profil Balita Baru (Identitas Awal)'}
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {formError && (
                <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '12px', fontSize: '11px', color: '#e11d48', alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: NIK & Nama */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>NIK Balita (KTP/KK)</label>
                  <input 
                    type="text" required maxLength={16} value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="16 digit nomor induk"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Lengkap Balita</label>
                  <input 
                    type="text" required value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap anak"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Row 2: JK, Tanggal Lahir */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Jenis Kelamin</label>
                  <select 
                    value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Tanggal Lahir</label>
                  <input 
                    type="date" required value={tanggalLahir}
                    onChange={(e) => setTanggalLahir(e.target.value)}
                    style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Row 3: Posyandu, Anak Ke, No HP */}
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Unit Posyandu Aktif</label>
                  <select 
                    value={posyanduId} onChange={(e) => setPosyanduId(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  >
                    <option value="">Pilih Posyandu</option>
                    {posyanduList.map(p => (
                      <option key={p.id} value={p.id}>{p.nama_posyandu}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Anak Ke</label>
                  <input 
                    type="number" min={1} value={anakKe}
                    onChange={(e) => setAnakKe(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>No. HP Orang Tua</label>
                  <input 
                    type="text" value={noHpOrtu}
                    onChange={(e) => setNoHpOrtu(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="628xxxxxxx"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Row 4: Nama Orang Tua */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Orang Tua / Wali</label>
                <input 
                  type="text" required value={namaOrtu}
                  onChange={(e) => setNamaOrtu(e.target.value)}
                  placeholder="Nama Ibu atau Ayah kandung"
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </div>

              {/* Row 5: BB & TB Lahir */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Berat Lahir (kg)</label>
                  <input 
                    type="number" step="0.01" value={bbLahir}
                    onChange={(e) => setBbLahir(e.target.value)}
                    placeholder="Contoh: 3.1"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Tinggi/Panjang Lahir (cm)</label>
                  <input 
                    type="number" step="0.1" value={tbLahir}
                    onChange={(e) => setTbLahir(e.target.value)}
                    placeholder="Contoh: 50.2"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Row 6: Alamat & RT */}
               <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Alamat Domisili Lengkap</label>
                  <input 
                    type="text" required value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Jalan, RT/RW, Dusun"
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>RT</label>
                  <input 
                    type="number" value={rt}
                    onChange={(e) => setRt(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
