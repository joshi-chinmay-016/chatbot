import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import ExecutionTrace from './ExecutionTrace';
import ApprovalModal from './ApprovalModal';

export default function AgentChat({
  messages = [],
  onSendMessage = () => {},
  onApprove = () => {},
  onReject = () => {},
  loading = false,
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  // Auto-scroll chat to latest message
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
    { label: '📘 Borrow Available', query: 'I want to borrow Python Crash Course' },
    { label: '⚡ Re-Plan Failure Demo', query: 'Can I borrow Clean Code?' },
    { label: '🤖 Recommend AI/ML', query: 'Recommend books on Artificial Intelligence' },
    { label: '🔄 Return Book', query: 'I want to return Clean Code' },
    { label: '📊 Library Stats', query: 'What is the current library inventory count?' },
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
              {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} style={{ color: 'var(--accent-primary)' }} />}
              <span>{msg.sender === 'user' ? 'You' : 'CMRIT Library Agent'}</span>
              <span className="font-mono">• {msg.timestamp || 'Just now'}</span>
            </div>

            <div className="msg-content">
              {msg.text}

              {/* Re-planning Alert Banner */}
              {msg.replanned && (
                <div className="replan-banner font-mono">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-amber)' }} />
                  <div>
                    <strong>AUTONOMOUS RE-PLANNING ACTIVE:</strong>
                    <div style={{ marginTop: '2px' }}>{msg.replan_reason}</div>
                  </div>
                </div>
              )}

              {/* Execution Trace Timeline */}
              {msg.execution_steps && msg.execution_steps.length > 0 && (
                <ExecutionTrace
                  steps={msg.execution_steps}
                  replanned={msg.replanned}
                  replanReason={msg.replan_reason}
                />
              )}

              {/* Human Approval Card */}
              {msg.human_approval_required && msg.status === 'awaiting_approval' && (
                <ApprovalModal
                  transaction={{
                    transaction_id: msg.transaction_id,
                    target_book: msg.alternative_book || msg.target_book,
                    action_type: msg.action_type,
                    type: msg.action_type,
                  }}
                  onApprove={onApprove}
                  onReject={onReject}
                  loading={loading}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-bubble agent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              <Bot size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>CMRIT Library Agent</span>
            </div>
            <div className="msg-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Agent reasoning & verifying catalog constraints...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask to borrow, return, or explore books in 3D..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!input.trim() || loading}
          style={{ padding: '0 18px', height: '44px' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
