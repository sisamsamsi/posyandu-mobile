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
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  adminName?: string;
  puskesmasName?: string;
}

export default function Sidebar({ 
  adminName: propAdminName, 
  puskesmasName: propPuskesmasName 
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
            setAdminName(p.kepala_puskesmas || 'Dr. dr. Hendra Irawan, M.Kes');
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
          setAdminName(parsed.kepalaPuskesmas || '');
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
          setAdminName(parsed.kepalaPuskesmas || '');
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
        { name: 'Rekomendasi Penyuluhan', path: '/balita/penyuluhan' },
        { name: 'Risiko Tinggi', path: '/balita/risiko-tinggi' }
      ]
    },
    { 
      name: 'Lansia', 
      icon: User,
      submenus: [
        { name: 'Data Lansia', path: '/lansia' },
        { name: 'Pemeriksaan Kesehatan', path: '/lansia/pemeriksaan' },
        { name: 'Risiko PTM', path: '/lansia/risiko-ptm' },
        { name: 'Kunjungan Prioritas', path: '/lansia/kunjungan-prioritas' }
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
    { name: 'Laporan', path: '/laporan', icon: FileSpreadsheet },
    { name: 'Pengaturan', path: '/pengaturan', icon: Settings },
  ];

  // Auto-expand menu based on current pathname (only one expanded)
  useEffect(() => {
    let activeMenu: string | null = null;
    menuItems.forEach(item => {
      if (item.submenus) {
        const hasActiveSub = item.submenus.some(sub => pathname === sub.path);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="sidebar">
      {/* Brand Logo Section */}
      <div 
        className="sidebar-brand" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '72px', 
          padding: '0 8px', 
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          marginRight: '-1px',
          overflow: 'hidden'
        }}
      >
        <img 
          src="/simpulsehat-logo.png?v=2" 
          alt="SIMPUL SEHAT" 
          style={{ width: '100%', maxWidth: '264px', height: 'auto', objectFit: 'contain' }} 
        />
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          if (item.submenus) {
            const isExpanded = expandedMenu === item.name;
            const isParentActive = item.submenus.some(sub => pathname === sub.path);

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
                      const isSubActive = pathname === sub.path;
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
        <img 
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80" 
          alt="Profile Avatar" 
          className="profile-avatar"
        />
        <div className="profile-info" style={{ flex: 1 }}>
          <span className="profile-name" title={adminName}>{adminName}</span>
          <span className="profile-role" title={puskesmasName}>{puskesmasName}</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="action-btn"
          title="Keluar"
          style={{ color: '#ffffff' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
