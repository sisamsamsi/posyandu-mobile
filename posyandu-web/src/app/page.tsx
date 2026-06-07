'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Redirect to dashboard if session already exists (either real or bypass)
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      const isBypass = localStorage.getItem('simpul_sehat_bypass_session');
      if (data?.session || isBypass === 'true') {
        router.push('/dashboard');
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const trimmedEmail = email.trim();

    try {
      // 1. Attempt standard sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        // 2. If it fails and user entered the default demo credentials, try to auto-signup
        if (trimmedEmail === 'kader@posyandu.com' && password === 'password123') {
          console.log('Demo user not found. Attempting auto-registration...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: password
          });

          if (signUpError) {
            throw new Error('Gagal masuk. Silakan gunakan tombol "Bypass Mode Simulasi" di bawah.');
          }

          if (signUpData?.session) {
            router.push('/dashboard');
            return;
          } else {
            // Signed up successfully but might require email confirmation
            // We can bypass in this case since we know they entered the correct credentials
            localStorage.setItem('simpul_sehat_bypass_session', 'true');
            router.push('/dashboard');
            return;
          }
        }
        
        throw error;
      }

      if (data?.session) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali email dan sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = () => {
    localStorage.setItem('simpul_sehat_bypass_session', 'true');
    router.push('/dashboard');
  };

  return (
    <div 
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9', // Soft background
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        padding: '24px'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '450px', // Increased size from 380px to 450px
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px', // Sleeker corners
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Premium shadow
          padding: '40px 48px', // Increased padding
          borderTop: '4px solid #14B8A6' // Elegant teal accent line at top
        }}
      >
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#f0fdfa', // Teal 50
              color: '#14B8A6', // Teal 600
              marginBottom: '16px',
              border: '1px solid #ccfbf1'
            }}
          >
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            SIMPUL SEHAT
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            Portal Administrasi Puskesmas & Integrasi Posyandu
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#fff1f2', // Red-50
              border: '1px solid #ffe4e6',
              borderRadius: '12px',
              color: '#e11d48',
              fontSize: '12px',
              marginBottom: '20px',
              lineHeight: '1.4'
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Alamat Email Staf
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Mail size={16} />
              </span>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@puskesmas.go.id"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '13px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.2s',
                  color: '#1e293b'
                }}
              />
            </div>
          </div>

          {/* Password input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Lock size={16} />
              </span>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '13px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.2s',
                  color: '#1e293b'
                }}
              />
            </div>
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <button 
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#14B8A6', // Teal-600
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.2s shadow 0.2s'
              }}
            >
              {loading ? 'Menghubungkan...' : 'Masuk ke Portal'}
              <ArrowRight size={14} />
            </button>

            <button 
              type="button"
              onClick={handleBypass}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <Sparkles size={14} style={{ color: '#14B8A6' }} />
              <span>Simulasi Masuk (Bypass Auth)</span>
            </button>
          </div>
        </form>

        {/* Development Helper Box */}
        <div 
          style={{
            marginTop: '28px',
            padding: '14px',
            backgroundColor: '#f0f9ff', // Blue 50
            border: '1px solid #bae6fd', // Blue 200
            borderRadius: '12px',
            fontSize: '11px',
            color: '#0369a1', // Blue 700
            lineHeight: '1.5'
          }}
        >
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={12} style={{ color: '#0284c7' }} />
            <span>Mode Pengembangan / Uji Coba</span>
          </div>
          Gunakan akun uji coba bawaan:<br />
          Email: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>kader@posyandu.com</span><br />
          Sandi: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>password123</span>
        </div>
      </div>
    </div>
  );
}
