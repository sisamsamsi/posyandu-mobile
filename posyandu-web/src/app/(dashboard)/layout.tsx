'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { FilterProvider } from '@/context/FilterContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <FilterProvider>
      <div className="app-container">
        {/* Mobile Sidebar Overlay Backdrop */}
        {isSidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
        
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Konten Utama */}
        <div className="main-wrapper">
          {/* Header Atas (Breadcrumbs & Select) */}
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          
          {/* Viewport Konten Utama */}
          <main className="content-viewport">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}

