'use client';
import * as React from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  { label: 'Summarize call', prompt: 'Summarize the call so far.' },
  { label: 'Action items', prompt: 'List all action items mentioned in the call.' },
  { label: 'Key decisions', prompt: 'What key decisions were made so far?' },
  { label: 'Take notes', prompt: 'Take structured notes on everything discussed so far.' },
];

export function AutrixPanel({
  token,
  callTitle = 'Meeting',
  onClose,
}: {
  token: string;
  callTitle?: string;
  onClose?: () => void;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = React.useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = ''; }
    setIsLoading(true);

    const userMsg: Msg = { id: Date.now(), role: 'user', content: trimmed };
    const assistantId = Date.now() + 1;
    const assistantMsg: Msg = { id: assistantId, role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch(`${API_URL}/api/supraleo/meeting-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, callTitle, stream: true }),
      });

      if (!res.ok || !res.body) {
        let errMsg = 'Something went wrong. Please try again.';
        try { const b = await res.json(); if (b?.message) errMsg = b.message; } catch {}
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: errMsg, streaming: false } : m));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const raw = t.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'delta' && parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
            } else if (parsed.type === 'done') {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
            } else if (parsed.type === 'error') {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: parsed.message || 'Error occurred.', streaming: false } : m));
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'Could not reach Autrix. Check your connection.', streaming: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [token, callTitle, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 72) + 'px';
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes autrix-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .autrix-cursor { display:inline-block; animation:autrix-blink 0.8s step-end infinite; color:#7c3aed; }
        .autrix-msgs::-webkit-scrollbar { width:3px; }
        .autrix-msgs::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:4px; }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 58,
        right: 12,
        width: 304,
        height: 430,
        background: 'rgba(8,8,10,0.97)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 215,
        backdropFilter: 'blur(24px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>A</div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#a0a0a0' }}>Autrix AI — Live Meeting</span>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '2px 4px', lineHeight: 1, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e0e0e0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
              ✕
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="autrix-msgs" style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
          {isEmpty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#333', textAlign: 'center', padding: 16 }}>
              <span style={{ fontSize: 26 }}>✦</span>
              <span style={{ fontSize: 11, lineHeight: 1.5 }}>Ask Autrix anything about the call.<br />Use the suggestions below to get started.</span>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{
              maxWidth: '90%',
              padding: '7px 10px',
              borderRadius: 10,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              fontSize: 12.5,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#1e1e3a' : '#161616',
              border: `1px solid ${msg.role === 'user' ? '#2d2d5e' : '#222'}`,
              color: msg.role === 'user' ? '#c7c7f0' : '#e0e0e0',
            }}>
              {msg.content}
              {msg.streaming && <span className="autrix-cursor">▋</span>}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only when empty) */}
        {isEmpty && (
          <div style={{ padding: '5px 10px', display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '1px solid #151515', flexShrink: 0 }}>
            {SUGGESTIONS.map(s => (
              <button key={s.label} onClick={() => sendMessage(s.prompt)} disabled={isLoading}
                style={{ background: '#181818', border: '1px solid #282828', color: '#888', fontSize: 10.5, padding: '3px 8px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c0c0c0'; e.currentTarget.style.borderColor = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#282828'; }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '8px 10px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Autrix about the meeting…"
            rows={1}
            disabled={isLoading}
            style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 7, color: '#e5e5e5', padding: '6px 9px', fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.4, minHeight: 32, maxHeight: 72, overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{ width: 32, height: 32, background: isLoading || !input.trim() ? '#1c1c1c' : '#4f46e5', border: 'none', borderRadius: 7, cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', color: isLoading || !input.trim() ? '#333' : '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
