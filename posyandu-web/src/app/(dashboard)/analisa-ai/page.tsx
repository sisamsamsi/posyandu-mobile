'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Send, Sparkles, MessageSquare, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
}

export default function AnalisaAiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya adalah Asisten AI SIMPUL SEHAT. Saya siap membantu Anda menganalisis data balita stunting, rekam penyakit lansia, membuat draf WhatsApp, atau menyusun draf rujukan Puskesmas. Apa yang bisa saya bantu hari ini?'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mock sessions history
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Evaluasi Gizi Sukamaju', date: 'Hari ini' },
    { id: '2', title: 'Draf WA Pengingat Timbang', date: 'Hari ini' },
    { id: '3', title: 'Analisis Hipertensi Mekarjaya', date: 'Kemarin' },
    { id: '4', title: 'WHO Z-Score Reference Help', date: '3 hari lalu' }
  ]);

  const [activeSessionId, setActiveSessionId] = useState('1');

  // Suggestions prompt list
  const suggestionPrompts = [
    'Tulis draf WhatsApp pengingat timbang untuk orang tua balita',
    'Bagaimana kriteria Z-score untuk balita stunting?',
    'Buat rekomendasi menu lansia penderita kolesterol tinggi',
    'Posyandu mana yang belum melapor bulan ini?'
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputValue('');
    setLoading(true);

    // Add empty assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          session: sessionData?.session
        })
      });

      if (!response.ok) {
        throw new Error('Gagal mendapatkan respon dari AI');
      }

      // Read chunk stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream reader tidak tersedia');
      }

      let done = false;
      let streamedText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          streamedText += chunk;
          
          // Update last assistant message
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: streamedText
            };
            return copy;
          });
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Maaf, terjadi gangguan koneksi saat menghubungi Groq AI. Mohon coba sesaat lagi.'
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: String(Date.now()),
      title: 'Obrolan Baru ' + (sessions.length + 1),
      date: 'Hari ini'
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setMessages([
      {
        role: 'assistant',
        content: 'Halo! Sesi obrolan baru dimulai. Silakan ajukan pertanyaan analisis data Puskesmas Anda.'
      }
    ]);
  };

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: '200px 1fr', 
        gap: '20px', 
        height: 'calc(100vh - 100px)',
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      {/* 1. CHAT HISTORY SIDEBAR */}
      <div 
        style={{ 
          borderRight: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        {/* New Session Button */}
        <div style={{ padding: '12px' }}>
          <button 
            onClick={handleNewSession}
            className="btn btn-secondary" 
            style={{ width: '100%', gap: '6px', fontSize: '11px', display: 'flex', justifyContent: 'center' }}
          >
            <Plus size={14} />
            <span>Sesi Baru</span>
          </button>
        </div>

        {/* Sessions list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', padding: '4px 8px', display: 'block' }}>RIWAYAT ANALISIS</span>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                // Switch session mocks message
                setMessages([
                  { role: 'assistant', content: `Anda membuka kembali sesi "${s.title}". Silakan ajukan pertanyaan lanjutan.` }
                ]);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '12px',
                border: 'none',
                background: s.id === activeSessionId ? '#f0fdfa' : 'transparent',
                color: s.id === activeSessionId ? '#14B8A6' : '#475569',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: s.id === activeSessionId ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
            >
              <MessageSquare size={12} style={{ flexShrink: 0 }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHAT CONSOLE */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Console Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={16} style={{ color: '#14B8A6' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
            Asisten AI Copilot SIMPUL SEHAT
          </span>
          <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Online</span>
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div 
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  backgroundColor: m.role === 'user' ? '#14B8A6' : '#f8fafc',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: m.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* Avatar for bot */}
                {m.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '10px', fontWeight: 600, color: '#14B8A6' }}>
                    <Sparkles size={12} />
                    <span>SIMPUL SEHAT COPILOT</span>
                  </div>
                )}
                {m.content || (loading && idx === messages.length - 1 ? 'AI sedang mengetik...' : '')}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>SHORTCUT PERTANYAAN CEPAT:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {suggestionPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendMessage(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#14B8A6';
                    e.currentTarget.style.color = '#14B8A6';
                    e.currentTarget.style.backgroundColor = '#f0fdfa';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={handleSubmitForm}
          style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #e2e8f0', 
            backgroundColor: '#f8fafc',
            display: 'flex',
            gap: '12px'
          }}
        >
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            placeholder="Tanyakan analisis data gizi atau draf rujukan..."
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              backgroundColor: '#fff'
            }}
          />
          <button 
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="btn btn-primary"
            style={{ borderRadius: '12px', padding: '0 16px' }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
