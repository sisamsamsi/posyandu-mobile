'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Building2 } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';

export default function Header() {
  const pathname = usePathname();
  const { 
    selectedDesa, 
    setSelectedDesa, 
    selectedPosyanduId, 
    setSelectedPosyanduId, 
    desaList, 
    posyanduList 
  } = useFilters();

  const [puskesmasName, setPuskesmasName] = useState('Puskesmas Pondok I');

  useEffect(() => {
    const updateProfile = () => {
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
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
  }, []);

  // Generate breadcrumbs & title based on route path
  const getBreadcrumbsAndTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0 || segments[0] === 'dashboard') {
      return {
        breadcrumbs: 'Dashboard',
        title: 'Dashboard'
      };
    }

    const mainPage = segments[0];
    const subPage = segments[1];

    let breadcrumbs = 'Dashboard';
    let title = '';

    // Translate main page segment to Indonesian label
    switch (mainPage) {
      case 'posyandu':
        breadcrumbs += ' > Posyandu';
        title = 'Manajemen Posyandu';
        break;
      case 'balita':
        breadcrumbs += ' > Balita';
        title = 'Data Balita';
        break;
      case 'lansia':
        breadcrumbs += ' > Lansia';
        title = 'Data Lansia';
        break;
      case 'analisa-ai':
        breadcrumbs += ' > Analisa AI';
        title = 'Analisa AI & Chat Copilot';
        break;
      case 'laporan':
        breadcrumbs += ' > Laporan';
        title = 'Laporan e-PPGBM';
        break;
      case 'import-data':
        breadcrumbs += ' > Import Data';
        title = 'Import Data';
        break;
      case 'pengaturan':
        breadcrumbs += ' > Pengaturan';
        title = 'Pengaturan Sistem';
        break;
      default:
        breadcrumbs += ` > ${mainPage.charAt(0).toUpperCase() + mainPage.slice(1)}`;
        title = mainPage.charAt(0).toUpperCase() + mainPage.slice(1);
    }

    if (subPage) {
      if (subPage === 'import-balita') {
        breadcrumbs += ' > Import Balita';
        title = 'Import Data Balita';
      } else if (subPage === 'import-lansia') {
        breadcrumbs += ' > Import Lansia';
        title = 'Import Data Lansia';
      } else {
        breadcrumbs += ` > Detail`;
        title = 'Detail Profil';
      }
    }

    return { breadcrumbs, title };
  };

  const { breadcrumbs, title } = getBreadcrumbsAndTitle();

  return (
    <header className="main-header">
      {/* Left: Dynamic Breadcrumb and Page Title */}
      <div className="header-title-section">
        <span className="header-breadcrumbs">{breadcrumbs}</span>
        <h1 className="header-title" style={{ fontSize: '15px', fontWeight: 600 }}>{title}</h1>
      </div>

      {/* Right: Controls (Global Filters, Puskesmas Dropdown & Notifications) */}
      <div className="header-controls">
        {/* Desa/Kelurahan Selector */}
        <select 
          className="header-select"
          value={selectedDesa}
          onChange={(e) => {
            setSelectedDesa(e.target.value);
            setSelectedPosyanduId('all'); // Reset posyandu filter when desa changes
          }}
        >
          <option value="all">Semua Kelurahan/Desa</option>
          {desaList.map((desa) => (
            <option key={desa} value={desa}>{desa}</option>
          ))}
        </select>

        {/* Posyandu Selector */}
        <select 
          className="header-select"
          value={selectedPosyanduId}
          onChange={(e) => setSelectedPosyanduId(e.target.value)}
        >
          <option value="all">Semua Unit Posyandu</option>
          {posyanduList.map((p) => (
            <option key={p.id} value={p.id}>{p.nama_posyandu}</option>
          ))}
        </select>

        <div 
          className="header-select" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'default',
            userSelect: 'none',
            backgroundColor: '#f8fafc' 
          }}
        >
          <Building2 size={14} style={{ color: '#14B8A6' }} />
          <span>{puskesmasName}</span>
        </div>

        {/* Notification Bell with Badge */}
        <div style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}>
          <Bell size={18} className="text-slate-600" />
          <span 
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '8px',
              height: '8px',
              backgroundColor: '#ef4444', // Red-500
              borderRadius: '50%',
              border: '2px solid #ffffff'
            }}
          />
        </div>
      </div>
    </header>
  );
}
