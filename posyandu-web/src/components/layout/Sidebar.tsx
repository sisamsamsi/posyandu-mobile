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

  const [adminName, setAdminName] = useState(propAdminName || 'Dr. Anisa Putri');
  const [puskesmasName, setPuskesmasName] = useState(propPuskesmasName || 'Puskesmas Pondok I');
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (propAdminName || propPuskesmasName) return;

    const updateProfile = () => {
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAdminName(parsed.kepalaPuskesmas || 'Dr. dr. Hendra Irawan, M.Kes');
          setPuskesmasName(parsed.namaPuskesmas || 'Puskesmas Pondok I');
        } catch (_) {}
      }
    };

    updateProfile();

    window.addEventListener('puskesmas-profile-updated', updateProfile);
    window.addEventListener('storage', updateProfile);
    return () => {
      window.removeEventListener('puskesmas-profile-updated', updateProfile);
      window.removeEventListener('storage', updateProfile);
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
      <div className="sidebar-brand">
        <svg 
          width="28" 
          height="28" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ color: '#ffffff' }}
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <div>
          <span className="sidebar-logo-text" style={{ display: 'block', fontWeight: 600 }}>
            SIMPUL SEHAT
          </span>
          <span className="sidebar-logo-sub">
            Sistem Informasi Kesehatan
          </span>
        </div>
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
          <span className="profile-name" title={adminName}>{isMounted ? adminName : ''}</span>
          <span className="profile-role" title={puskesmasName}>{isMounted ? puskesmasName : ''}</span>
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
