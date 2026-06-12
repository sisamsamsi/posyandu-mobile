'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'neutral';
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

export interface ActionItem {
  nama: string;
  keterangan: string;
  urgensi: 'tinggi' | 'sedang';
}

export interface SubmenuPlaceholderProps {
  title: string;
  parentTitle: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  sectionTitle?: string;
  loading?: boolean;
  stats?: StatItem[];
  children?: React.ReactNode;
  insightText?: string;
  actionItems?: ActionItem[];
}

const COLOR_MAP: Record<NonNullable<StatItem['color']>, string> = {
  neutral: '#64748b',
  primary: '#14B8A6',
  danger: '#e11d48',
  warning: '#ea580c',
  success: '#16a34a',
};

function StatBar({ stats, loading }: { stats: StatItem[]; loading?: boolean }) {
  const items = stats.slice(0, 4);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: '12px',
      }}
    >
      {items.map((stat, idx) => {
        const borderColor = COLOR_MAP[stat.color || 'neutral'];
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="card"
            style={{
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: 'var(--box-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {Icon && <Icon size={14} style={{ color: borderColor } as React.CSSProperties} />}
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                }}
              >
                {loading ? '—' : stat.value}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InsightSection({
  insightText,
  actionItems,
}: {
  insightText?: string;
  actionItems?: ActionItem[];
}) {
  if (actionItems && actionItems.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
          Tindakan Prioritas
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {actionItems.slice(0, 3).map((item, idx) => {
            const isTinggi = item.urgensi === 'tinggi';
            return (
              <div
                key={idx}
                className="card"
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: 'var(--box-shadow)',
                  position: 'relative',
                }}
              >
                <span
                  className={`badge ${isTinggi ? 'badge-danger' : 'badge-warning'}`}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '9px',
                  }}
                >
                  {isTinggi ? 'Tinggi' : 'Sedang'}
                </span>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    margin: '0 0 6px 0',
                    paddingRight: '56px',
                    lineHeight: 1.4,
                  }}
                >
                  {item.nama}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {item.keterangan}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (insightText) {
    return (
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          borderLeft: '4px solid var(--color-primary)',
          boxShadow: 'var(--box-shadow)',
        }}
      >
        <h2
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-primary)',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Ringkasan Kondisi
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-main)',
            margin: 0,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{
            __html: insightText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
          }}
        />
      </div>
    );
  }

  return null;
}

export default function SubmenuPlaceholder({
  title,
  parentTitle,
  icon: Icon,
  sectionTitle,
  loading = false,
  stats,
  children,
  insightText,
  actionItems,
}: SubmenuPlaceholderProps) {
  const showInsight = !!(insightText || (actionItems && actionItems.length > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page header */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
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
              color: 'var(--color-primary)',
            }}
          >
            <Icon size={18} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            {title}
          </h1>
        </div>
      </div>

      {/* ZONA A — Stat Bar */}
      {stats && stats.length > 0 && <StatBar stats={stats} loading={loading} />}

      {/* ZONA B — Main content */}
      {children && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sectionTitle && (
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              {sectionTitle}
            </h2>
          )}
          {children}
        </div>
      )}

      {/* ZONA C — Footer insight */}
      {!loading && showInsight && (
        <InsightSection insightText={insightText} actionItems={actionItems} />
      )}
    </div>
  );
}
