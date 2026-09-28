import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Globe,
  Calculator,
  FileText,
  CheckCircle,
  Eye,
} from 'lucide-react';
import ExecutionTrace from './ExecutionTrace';

export default function AgentChat({
  messages = [],
  onSendMessage = () => {},
  onOpenNote = () => {},
  loading = false,
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleScenarioClick = (prompt) => {
    if (loading) return;
    onSendMessage(prompt);
  };

  const quickScenarios = [
    {
      label: '🔬 Isaac Newton Study',
      query: 'Research Isaac Newton on Wikipedia, calculate what year it was 300 years after his birth (1643), and save a 3-bullet revision note to newton_facts.md',
    },
    {
      label: '🚀 Escape Velocity Physics',
      query: 'Research Escape Velocity on Wikipedia, calculate sqrt(2 * 9.8 * 6371000) for Earth, and save notes to escape_velocity.md',
    },
    {
      label: '⚡ Quantum Superposition',
      query: 'Research Quantum Superposition on Wikipedia, explain it simply, and save a revision guide to quantum_notes.md',
    },
    {
      label: '🧮 Euler & Operations',
      query: 'Calculate sqrt(144) * 5 + 2^4 and derive Euler\'s identity in study_notes',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Quick Scenarios Bar */}
      <div className="scenarios-container">
        <div className="scenarios-label">
          <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Autonomous Scenarios</span>
        </div>
        <div className="chips-row">
          {quickScenarios.map((sc, i) => (
            <button
              key={i}
              className="scenario-chip font-mono"
              onClick={() => handleScenarioClick(sc.query)}
              disabled={loading}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {msg.sender === 'user' ? (
                <User size={13} />
              ) : (
                <Bot size={13} style={{ color: 'var(--accent-cyan)' }} />
              )}
              <span style={{ fontWeight: 600, color: msg.sender === 'user' ? '#94a3b8' : 'var(--accent-cyan)' }}>
                {msg.sender === 'user' ? 'You' : 'Study Assistant AI'}
              </span>
              <span className="font-mono">• {msg.timestamp || 'Just now'}</span>
            </div>

            <div className="msg-content">
              {msg.text}

              {/* Saved Files Chips */}
              {msg.saved_files && msg.saved_files.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {msg.saved_files.map((file, idx) => (
                    <button
                      key={idx}
                      className="btn-secondary font-mono"
                      style={{
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderColor: 'var(--accent-emerald)',
                        color: 'var(--accent-emerald)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={() => onOpenNote({ filename: file })}
                    >
                      <CheckCircle size={12} />
                      <span>Saved: {file}</span>
                      <Eye size={11} style={{ marginLeft: '4px' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Tools Badges */}
              {msg.tools_used && msg.tools_used.length > 0 && (
                <div className="tools-summary-bar">
                  {msg.tools_used.map((tool, idx) => (
                    <span
                      key={idx}
                      className={`tool-tag font-mono ${
                        tool.includes('wiki') ? 'wiki' : tool.includes('calc') ? 'math' : 'file'
                      }`}
                    >
                      {tool.includes('wiki') && <Globe size={11} />}
                      {tool.includes('calc') && <Calculator size={11} />}
                      {tool.includes('save') && <FileText size={11} />}
                      <span>{tool}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Execution Trace Timeline */}
              {msg.execution_steps && msg.execution_steps.length > 0 && (
                <ExecutionTrace steps={msg.execution_steps} />
              )}
            </div>
          </div>
        ))}

        {/* Live Loading Thinking Bubble */}
        {loading && (
          <div className="message-bubble agent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
              <Bot size={13} />
              <span style={{ fontWeight: 600 }}>Study Assistant AI</span>
              <span className="font-mono">• Autonomous Agent Loop Active</span>
            </div>
            <div className="msg-content" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px' }}>
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Consulting Wikipedia, evaluating formulas & updating 3D knowledge nexus...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="input-box-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask to research a topic, calculate scientific formulas, or compile study notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-send" disabled={loading || !input.trim()}>
            {loading ? <RefreshCw size={15} className="spin-slow" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
