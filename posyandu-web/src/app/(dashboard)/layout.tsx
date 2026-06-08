'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { FilterProvider } from '@/context/FilterContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <div className="app-container">
        <Sidebar />
        
        {/* Konten Utama */}
        <div className="main-wrapper">
          {/* Header Atas (Breadcrumbs & Select) */}
          <Header />
          
          {/* Viewport Konten Utama */}
          <main className="content-viewport">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
