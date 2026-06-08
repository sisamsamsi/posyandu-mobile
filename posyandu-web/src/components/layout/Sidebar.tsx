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
  Upload, 
  Settings,
  LogOut
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

  useEffect(() => {
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
    { name: 'Posyandu', path: '/posyandu', icon: Building2 },
    { name: 'Balita', path: '/balita', icon: Baby },
    { name: 'Lansia', path: '/lansia', icon: User },
    { name: 'Analisa AI', path: '/analisa-ai', icon: BrainCircuit },
    { name: 'Laporan', path: '/laporan', icon: FileSpreadsheet },
    { name: 'Import Data', path: '/import-data', icon: Upload },
    { name: 'Pengaturan', path: '/pengaturan', icon: Settings },
  ];

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
          className="text-teal-600"
          style={{ color: '#14B8A6' }}
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
          const isActive = pathname.startsWith(item.path);

          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.name}</span>
            </Link>
          );
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
          style={{ color: '#ef4444' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
