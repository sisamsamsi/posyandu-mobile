'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Baby, 
  User, 
  BrainCircuit, 
  FileSpreadsheet, 
  Settings,
  LogOut,
  ChevronDown,
  FileUp,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const getInitials = (name: string) => {
  if (!name) return 'OP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface SidebarProps {
  adminName?: string;
  puskesmasName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ 
  adminName: propAdminName, 
  puskesmasName: propPuskesmasName,
  isOpen = false,
  onClose
}: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();

  const [adminName, setAdminName] = useState(propAdminName || '');
  const [puskesmasName, setPuskesmasName] = useState(propPuskesmasName || 'Memuat...');
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    if (propAdminName || propPuskesmasName) return;

    async function loadAndSyncProfile() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Sesi tidak valid di Sidebar, mengeluarkan pengguna:', error.message);
          await supabase.auth.signOut();
          router.push('/');
          return;
        }

        const session = data?.session;
        if (!session) {
          console.warn('Sesi tidak ditemukan di Sidebar, mengarahkan ke halaman login.');
          router.push('/');
          return;
        }

        if (session.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select(`
              puskesmas:puskesmas(*)
            `)
            .eq('user_id', session.user.id)
            .single();

          if (roleData && roleData.puskesmas) {
            const p = (Array.isArray(roleData.puskesmas) ? roleData.puskesmas[0] : roleData.puskesmas) as any;
            const profile = {
              namaPuskesmas: p.nama_puskesmas,
              kodePuskesmas: p.kode_puskesmas,
              kecamatan: p.kecamatan,
              kepalaPuskesmas: p.kepala_puskesmas,
              nipKepala: p.nip_kepala,
              alamat: p.alamat
            };
            localStorage.setItem('simpul_sehat_puskesmas_profile', JSON.stringify(profile));
            setAdminName(p.kepala_puskesmas || 'Operator Puskesmas');
            setPuskesmasName(p.nama_puskesmas || 'Puskesmas Pondok I');
            window.dispatchEvent(new Event('puskesmas-profile-updated'));
            return;
          }
        }
      } catch (err) {
        console.warn('Gagal memuat profil Puskesmas dari database di Sidebar, menggunakan data lokal:', err);
      }

      // Fallback
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAdminName(parsed.kepalaPuskesmas || 'Operator Puskesmas');
          setPuskesmasName(parsed.namaPuskesmas || 'Puskesmas');
        } catch (_) {}
      }
    }

    loadAndSyncProfile();

    const handleProfileUpdate = () => {
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAdminName(parsed.kepalaPuskesmas || 'Operator Puskesmas');
          setPuskesmasName(parsed.namaPuskesmas || 'Puskesmas');
        } catch (_) {}
      }
    };

    window.addEventListener('puskesmas-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('puskesmas-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [propAdminName, propPuskesmasName]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Posyandu', 
      icon: Building2,
      submenus: [
        { name: 'Daftar Posyandu', path: '/posyandu' },
        { name: 'Kehadiran & Pelaporan', path: '/posyandu/kehadiran' }
      ]
    },
    { 
      name: 'Balita', 
      icon: Baby,
      submenus: [
        { name: 'Data Balita', path: '/balita' },
        { name: 'Status Gizi', path: '/balita/status-gizi' },
        { name: 'Penimbangan', path: '/balita/penimbangan' },
        { name: 'Imunisasi', path: '/balita/imunisasi' },
        { name: 'Rekomendasi Penyuluhan', path: '/balita/penyuluhan' },
        { name: 'Risiko Tinggi', path: '/balita/risiko-tinggi' },
        { name: 'Import Data Balita', path: '/import-data?type=balita' }
      ]
    },
    { 
      name: 'Lansia', 
      icon: User,
      submenus: [
        { name: 'Data Lansia', path: '/lansia' },
        { name: 'Pemeriksaan Kesehatan', path: '/lansia/pemeriksaan' },
        { name: 'Risiko PTM', path: '/lansia/risiko-ptm' },
        { name: 'Kunjungan Prioritas', path: '/lansia/kunjungan-prioritas' },
        { name: 'Import Data Lansia', path: '/import-data?type=lansia' }
      ]
    },
    { 
      name: 'Analitik Wilayah', 
      icon: BrainCircuit,
      submenus: [
        { name: 'Ringkasan Wilayah', path: '/analisa-ai' },
        { name: 'Risiko Balita', path: '/analisa-ai/risiko-balita' },
        { name: 'Risiko Lansia', path: '/analisa-ai/risiko-lansia' },
        { name: 'Tren & Prediksi', path: '/analisa-ai/tren-prediksi' },
        { name: 'Prioritas Intervensi', path: '/analisa-ai/prioritas-intervensi' },
        { name: 'Pemantauan Posyandu', path: '/analisa-ai/posyandu-bermasalah' },
        { name: 'Deteksi Anomali', path: '/analisa-ai/deteksi-anomali' },
        { name: 'Rekomendasi Penyuluhan', path: '/analisa-ai/rekomendasi-penyuluhan' }
      ]
    },
    { name: 'Import Data (Sistem)', path: '/import-data', icon: FileUp },
    { name: 'Laporan', path: '/laporan', icon: FileSpreadsheet },
    { name: 'Pengaturan', path: '/pengaturan', icon: Settings },
  ];

  // Auto-expand menu based on current pathname (only one expanded)
  useEffect(() => {
    let activeMenu: string | null = null;
    menuItems.forEach(item => {
      if (item.submenus) {
        const hasActiveSub = item.submenus.some(sub => pathname === sub.path.split('?')[0]);
        if (hasActiveSub) {
          activeMenu = item.name;
        }
      }
    });
    if (activeMenu) {
      setExpandedMenu(activeMenu);
    }
  }, [pathname]);

  const toggleMenu = (name: string) => {
    setExpandedMenu(prev => (prev === name ? null : name));
  };

  const handleSignOut = () => {
    alert('Fungsi Keluar (Logout) dinonaktifkan sementara.');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Logo Section */}
      <div 
        className="sidebar-brand" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          height: '90px', 
          padding: '0 12px', 
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          marginRight: '-1px',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <img 
            src="/simpulsehat-logo.png?v=2" 
            alt="SIMPUL SEHAT" 
            style={{ maxHeight: '82px', maxWidth: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} 
          />
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="sidebar-close-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              padding: '4px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          if (item.submenus) {
            const isExpanded = expandedMenu === item.name;
            const isParentActive = item.submenus.some(sub => pathname === sub.path.split('?')[0]);

            return (
              <div key={item.name} className="submenu-wrapper">
                <button 
                  onClick={() => toggleMenu(item.name)}
                  className={`menu-item ${isParentActive ? 'parent-active' : ''}`}
                >
                  <div className="menu-item-content">
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} 
                  />
                </button>
                <div className={`submenu-container ${isExpanded ? 'expanded' : ''}`}>
                  <div className="submenu-list">
                    {item.submenus.map((sub) => {
                      const isSubActive = pathname === sub.path.split('?')[0];
                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          className={`submenu-item ${isSubActive ? 'active' : ''}`}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          } else {
            const isActive = item.path ? (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'))) : false;
            return (
              <Link 
                key={item.name} 
                href={item.path || '#'}
                className={`menu-item ${isActive ? 'active' : ''}`}
              >
                <div className="menu-item-content">
                  <Icon size={16} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          }
        })}
      </nav>

      {/* User Profile Card */}
      <div className="sidebar-profile">
        <div 
          className="profile-avatar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          {getInitials(adminName)}
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <span className="profile-name" title={adminName}>{adminName}</span>
          <span className="profile-role" title={puskesmasName}>{puskesmasName}</span>
        </div>
        <button 
          disabled
          className="action-btn"
          title="Keluar (Nonaktif)"
          style={{ 
            color: 'rgba(255, 255, 255, 0.3)', 
            cursor: 'not-allowed',
            opacity: 0.5
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
