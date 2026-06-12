'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AIInsightBoxProps {
  konteks: string;
  bulan: string;
  filter: string;
  data: Record<string, any>;
}

export default function AIInsightBox({
  konteks,
  bulan,
  filter,
  data
}: AIInsightBoxProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Use a ref to prevent duplicate triggers on the same data
  const lastDataRef = useRef<string>('');

  const getPuskesmasName = () => {
    try {
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.namaPuskesmas || 'Puskesmas';
      }
      return 'Puskesmas';
    } catch {
      return 'Puskesmas';
    }
  };

  const fetchInsight = useCallback(async (force = false) => {
    const dataStr = JSON.stringify(data);
    
    // Don't fetch if data is empty
    if (!dataStr || Object.keys(data).length === 0) return;

    // Prevent duplicate fetch on same data unless forced
    if (!force && lastDataRef.current === dataStr) return;
    
    lastDataRef.current = dataStr;
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          konteks,
          puskesmas: getPuskesmasName(),
          bulan,
          filter,
          data
        })
      });

      if (!res.ok) throw new Error('API Error');
      const json = await res.json();
      setInsight(json.insight || '');
    } catch (err) {
      console.error('Failed to fetch AI insight:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [konteks, bulan, filter, data]);

  // Auto fetch when data is ready
  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  // If data is empty, do not render anything
  if (Object.keys(data).length === 0) return null;

  return (
    <div style={{
      padding: '14px 18px',
      backgroundColor: '#f0fdfa', // Light teal tint
      borderRadius: '14px',
      borderLeft: '4px solid var(--color-primary, #14B8A6)',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      marginBottom: '16px',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <div style={{
        marginTop: '2px',
        padding: '5px',
        backgroundColor: '#e6fffa',
        borderRadius: '8px',
        color: 'var(--color-primary, #14B8A6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Sparkles size={14} className={loading ? 'animate-pulse' : ''} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: 'var(--color-primary-hover, #0d9488)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em', 
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          Simpul Sehat AI Insights
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
            <div style={{
              height: '10px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              width: '90%',
              animation: 'skeleton-pulse 1.2s infinite ease-in-out'
            }} />
            <div style={{
              height: '10px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              width: '75%',
              animation: 'skeleton-pulse 1.2s infinite ease-in-out'
            }} />
          </div>
        ) : error ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: 0, fontStyle: 'italic' }}>
            Gagal memuat rekomendasi otomatis. Silakan coba perbarui kembali.
          </p>
        ) : insight ? (
          <p style={{ 
            fontSize: '12.5px', 
            color: 'var(--text-main, #0F172A)', 
            lineHeight: '1.6', 
            margin: 0,
            fontWeight: 500
          }}>
            {insight}
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: 0, fontStyle: 'italic' }}>
            Tidak ada ringkasan yang tersedia.
          </p>
        )}
      </div>

      {!loading && (
        <button
          onClick={() => fetchInsight(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: 'var(--text-muted, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            alignSelf: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6fffa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Perbarui ringkasan"
        >
          <RefreshCw size={13} />
        </button>
      )}

      {/* Embedded inline animation styles */}
      <style jsx global>{`
        @keyframes skeleton-pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
