'use client';

import React from 'react';
import { ChevronRight, Lightbulb, Database, Sparkles, MessageSquare } from 'lucide-react';

interface SubmenuPlaceholderProps {
  title: string;
  parentTitle: string;
  description: string;
  icon: React.ComponentType<any>;
  discussionPoints: string[];
  children?: React.ReactNode;
}

export default function SubmenuPlaceholder({
  title,
  parentTitle,
  description,
  icon: Icon,
  discussionPoints,
  children
}: SubmenuPlaceholderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header & Breadcrumbs */}
      <div>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            marginBottom: '4px' 
          }}
        >
          <span>{parentTitle}</span>
          <ChevronRight size={10} />
          <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              backgroundColor: 'var(--color-primary-light)', 
              color: 'var(--color-primary)' 
            }}
          >
            <Icon size={18} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            {title}
          </h1>
        </div>
      </div>

      {/* Info & Action Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '16px', 
          backgroundColor: '#ffffff', 
          borderRadius: '16px', 
          borderLeft: '4px solid var(--color-primary)',
          boxShadow: 'var(--box-shadow)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              Modul Layanan Simpul Sehat
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Data Sync Section (rendered if children are present) */}
      {children && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              Sinkronisasi Data Real-Time (Supabase)
            </h2>
          </div>
          {children}
        </div>
      )}

      {/* Rencana Pengembangan & Diskusi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            Rencana Pengembangan & Diskusi UI/UX
          </h2>
        </div>
        
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '16px' 
          }}
        >
          {discussionPoints.map((point, index) => (
            <div 
              key={index} 
              className="card"
              style={{ 
                padding: '16px', 
                backgroundColor: '#ffffff', 
                borderRadius: '16px', 
                boxShadow: 'var(--box-shadow)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--box-shadow)';
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(20, 184, 166, 0.1)', 
                    color: 'var(--color-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Topik Diskusi #{index + 1}
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.4', margin: 0 }}>
                    {point}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
