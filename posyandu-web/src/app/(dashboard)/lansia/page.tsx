'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Eye, Edit, Trash2, User, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Lansia {
  id: string;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  alamat: string | null;
  rt: number | null;
  posyandu_id: string | null;
  penyakit_bawaan: string[];
  posyandu?: { nama_posyandu: string; kelurahan: string };
  pemeriksaan_lansias?: Array<{
    tanggal_periksa: string;
    tekanan_darah: string | null;
    gula_darah: number | null;
    kolesterol: number | null;
    asam_urat: number | null;
  }>;
}

export default function LansiaPage() {
  const router = useRouter();
  const { selectedDesa, selectedPosyanduId, posyanduList, loading: filtersLoading } = useFilters();
  
  // Data States
  const [lansias, setLansias] = useState<Lansia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form States
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-laki');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState('1');
  const [penyakitBawaanInput, setPenyakitBawaanInput] = useState('');
  const [posyanduId, setPosyanduId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch Lansias
  const fetchLansias = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('lansias')
        .select(`
          id, nik, nama, jenis_kelamin, tanggal_lahir, alamat, rt, posyandu_id, penyakit_bawaan,
          posyandu:posyandus(nama_posyandu, kelurahan),
          pemeriksaan_lansias(tanggal_periksa, tekanan_darah, gula_darah, kolesterol, asam_urat)
        `);
      const { data, error } = await query.order('nama', { ascending: true });

      if (error) throw error;

      let filtered = (data || []) as any as Lansia[];

      // Filter by global Desa/Kalurahan context
      if (selectedDesa !== 'all') {
        filtered = filtered.filter(l => l.posyandu?.kelurahan === selectedDesa);
      }

      // Filter by global Posyandu context
      if (selectedPosyanduId !== 'all') {
        filtered = filtered.filter(l => l.posyandu_id === selectedPosyanduId);
      }

      // Sort examinations inside each lansia to get the latest one
      filtered.forEach(l => {
        if (l.pemeriksaan_lansias && l.pemeriksaan_lansias.length > 0) {
          l.pemeriksaan_lansias = [l.pemeriksaan_lansias[l.pemeriksaan_lansias.length - 1]];
        }
      });

      setLansias(filtered as any[]);
    } catch (err: any) {
      console.error('Error loading lansias:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoading) {
      fetchLansias();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const editParam = searchParams.get('edit');
    if (editParam && lansias.length > 0) {
      const match = lansias.find(l => l.id === editParam);
      if (match) {
        handleOpenEditModal(match);
        router.replace('/lansia');
      }
    }
  }, [lansias]);

  // Handle Search & Filter in UI
  const filteredData = lansias.filter(l => {
    const q = searchQuery.toLowerCase();
    return (
      l.nama.toLowerCase().includes(q) ||
      l.nik.includes(q) ||
      (l.posyandu?.nama_posyandu || '').toLowerCase().includes(q)
    );
  });

  // Reset to page 1 when filters or search terms change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDesa, selectedPosyanduId]);

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

  // Calculate age
  const calculateAge = (dobStr: string) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenModal = () => {
    setEditId(null);
    setNik('');
    setNama('');
    setJenisKelamin('Laki-laki');
    setTanggalLahir('');
    setAlamat('');
    setRt('1');
    setPenyakitBawaanInput('');
    setFormError('');
    setPosyanduId(posyanduList.length > 0 ? posyanduList[0].id : '');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (l: any) => {
    setEditId(l.id);
    setNik(l.nik || '');
    setNama(l.nama || '');
    setJenisKelamin(l.jenis_kelamin || 'Laki-laki');
    setTanggalLahir(l.tanggal_lahir || '');
    setAlamat(l.alamat || '');
    setRt(String(l.rt || '1'));
    setPenyakitBawaanInput(l.penyakit_bawaan ? l.penyakit_bawaan.join(', ') : '');
    setPosyanduId(l.posyandu_id || '');
    setFormError('');
    setShowAddModal(true);
  };

  const handleDeleteLansia = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data lansia ${name}? Semua data pemeriksaan lansia ini juga akan terhapus.`)) {
      try {
        setLoading(true);
        // Delete dependent records first to safeguard database integrity
        await supabase.from('pemeriksaan_lansias').delete().eq('lansia_id', id);
        const { error } = await supabase.from('lansias').delete().eq('id', id);
        if (error) throw error;
        fetchLansias();
      } catch (err: any) {
        alert('Gagal menghapus lansia: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddLansia = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (nik.length !== 16 || isNaN(Number(nik))) {
      setFormError('NIK wajib berisi 16 digit angka.');
      return;
    }

    if (!posyanduId) {
      setFormError('Silakan pilih Unit Posyandu.');
      return;
    }

    const age = calculateAge(tanggalLahir);
    if (age < 45) {
      setFormError('Usia pendaftaran lansia minimal 45 tahun (Pra-Lansia).');
      return;
    }

    setSubmitting(true);
    try {
      // 1. If not editing, check if NIK already exists
      if (!editId) {
        const { data: existing } = await supabase
          .from('lansias')
          .select('id, nama, posyandus(nama_posyandu)')
          .eq('nik', nik)
          .maybeSingle();

        if (existing) {
          throw new Error(`Lansia dengan NIK ini sudah terdaftar atas nama ${existing.nama} di ${(existing as any).posyandus?.nama_posyandu || 'Posyandu'}`);
        }
      }

      // Parse penyakit bawaan
      const penyakitArray = penyakitBawaanInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        nik,
        nama: nama.trim(),
        jenis_kelamin: jenisKelamin as any,
        tanggal_lahir: tanggalLahir,
        alamat: alamat.trim(),
        rt: parseInt(rt) || 1,
        posyandu_id: posyanduId,
        penyakit_bawaan: penyakitArray
      };

      if (editId) {
        // 2a. Update lansia profile
        const { error: updateError } = await supabase
          .from('lansias')
          .update(payload)
          .eq('id', editId);

        if (updateError) throw updateError;
      } else {
        // 2b. Insert lansia profile
        const { error: insertError } = await supabase
          .from('lansias')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      setShowAddModal(false);
      fetchLansias();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data lansia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* SEARCH & FILTER BAR */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <div className="search-input-wrapper">
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
            <span>Tambah Lansia</span>
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Memuat data lansia...
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ditemukan data lansia yang cocok.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Lansia</th>
                <th>NIK</th>
                <th>JK</th>
                <th>Umur</th>
                <th>Posyandu</th>
                <th>Tekanan Darah</th>
                <th>Gula Darah (mg/dL)</th>
                <th>Asam Urat</th>
                <th>Penyakit Bawaan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((l, index) => {
                const latestExam = l.pemeriksaan_lansias?.[0] || null;
                const age = calculateAge(l.tanggal_lahir);
                
                return (
                  <tr key={l.id}>
                    <td>{startIndex + index + 1}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b' }}>{l.nama}</td>
                    <td style={{ fontFamily: 'monospace' }}>{l.nik}</td>
                    <td>{l.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td>{age} thn</td>
                    <td>{l.posyandu?.nama_posyandu || '-'}</td>
                    <td>
                      {latestExam?.tekanan_darah ? (
                        <span style={{ 
                          color: parseInt(latestExam.tekanan_darah.split('/')[0]) >= 140 ? '#ef4444' : 'inherit',
                          fontWeight: parseInt(latestExam.tekanan_darah.split('/')[0]) >= 140 ? 600 : 'normal'
                        }}>
                          {latestExam.tekanan_darah}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {latestExam?.gula_darah ? (
                        <span style={{ 
                          color: latestExam.gula_darah >= 200 ? '#ef4444' : 'inherit',
                          fontWeight: latestExam.gula_darah >= 200 ? 600 : 'normal'
                        }}>
                          {latestExam.gula_darah}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{latestExam?.asam_urat ? latestExam.asam_urat.toFixed(1) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {l.penyakit_bawaan && l.penyakit_bawaan.length > 0 ? (
                          l.penyakit_bawaan.map(p => (
                            <span key={p} className="badge badge-warning" style={{ fontSize: '10px' }}>{p}</span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Tidak ada</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => router.push(`/lansia/${l.id}`)}
                          className="action-btn"
                          title="Lihat Rekam Medis Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(l)}
                          className="action-btn" 
                          title="Ubah Data"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLansia(l.id, l.nama)}
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
            <span>Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} - {endIndex} dari {filteredData.length} data lansia</span>
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

      {/* ADD LANSIA MODAL */}
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
            onSubmit={handleAddLansia}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                {editId ? `Ubah Profil Lansia: ${nama}` : 'Tambah Profil Lansia Baru'}
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formError && (
                <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '12px', fontSize: '11px', color: '#e11d48', alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* NIK */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>NIK Lansia</label>
                <input 
                  type="text" required maxLength={16} value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="16 digit NIK"
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </div>

              {/* Nama */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Lengkap Lansia</label>
                <input 
                  type="text" required value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap"
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </div>

              {/* JK & Tanggal Lahir */}
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

              {/* Posyandu & RT */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Unit Posyandu Lansia</label>
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
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>RT</label>
                  <input 
                    type="number" value={rt}
                    onChange={(e) => setRt(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Alamat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Alamat Domisili</label>
                <input 
                  type="text" required value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Dusun, RT/RW, Desa"
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </div>

              {/* Penyakit Bawaan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Riwayat Penyakit Bawaan (Riwayat Klinis)</label>
                <input 
                  type="text" value={penyakitBawaanInput}
                  onChange={(e) => setPenyakitBawaanInput(e.target.value)}
                  placeholder="Contoh: Hipertensi, Diabetes, Asam Urat (Pisahkan dengan koma)"
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
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
