import React, { useState, useEffect } from 'react';
import {
  Library,
  Layers,
  MessageSquare,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Library3DScene from './components/Library3DScene';
import AgentChat from './components/AgentChat';
import BookInspectorModal from './components/BookInspectorModal';
import { getCategoryPalette } from './components/Book3D';

export default function App() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [hoverFilter, setHoverFilter] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'catalog'
  const [isFullscreen3D, setIsFullscreen3D] = useState(false);
  const [loading, setLoading] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Welcome to the CMRIT Autonomous 3D Library! I can help you find, inspect, borrow, and return technical books. Explore the 3D shelves on the left or try the quick autonomous scenarios above.',
      timestamp: '00:00',
      execution_steps: [],
      replanned: false,
    }
  ]);

  // Load books & stats on mount
  const refreshLibraryData = async () => {
    try {
      const [resBooks, resStats] = await Promise.all([
        fetch('/api/library/books'),
        fetch('/api/library/stats')
      ]);
      if (resBooks.ok) {
        const dataBooks = await resBooks.json();
        setBooks(dataBooks);
      }
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }
    } catch (err) {
      console.error('Failed to fetch library state:', err);
    }
  };

  useEffect(() => {
    refreshLibraryData();
  }, []);

  // Handle User Message Submission
  const handleSendMessage = async (queryText) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      sender: 'user',
      text: queryText,
      timestamp: timeStr,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/library/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          student_id: 'student-demo',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const agentMsg = {
        sender: 'agent',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transaction_id: data.transaction_id,
        action_type: data.action_type,
        target_book: data.target_book,
        alternative_book: data.alternative_book,
        execution_steps: data.execution_steps || [],
        replanned: data.replanned || false,
        replan_reason: data.replan_reason,
        status: data.status,
        human_approval_required: data.human_approval_required,
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If target book identified, select it in 3D scene
      if (data.alternative_book || data.target_book) {
        const bookToSelect = books.find(
          (b) => b.title.toLowerCase() === (data.alternative_book || data.target_book).toLowerCase()
        );
        if (bookToSelect) setSelectedBook(bookToSelect);
      }

      // Refresh catalog state in case of changes
      refreshLibraryData();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Apologies, encountered an agent execution issue: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          execution_steps: [],
          replanned: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Human Approval
  const handleApprove = async (txId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId, action: 'approve' }),
      });
      if (res.ok) {
        const approvalData = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `✅ ${approvalData.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            execution_steps: [
              {
                step_number: 1,
                phase: 'ACTION',
                action: 'Commit authorized library inventory update',
                observation: approvalData.authorized_action,
                evaluation: 'TRANSACTION COMMITTED TO DISK',
                reasoning: 'Human authorization granted. Inventory and student loan registry updated.'
              }
            ],
            replanned: false,
            human_approval_required: false,
          }
        ]);
        await refreshLibraryData();
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Human Rejection
  const handleReject = async (txId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId, action: 'reject' }),
      });
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `❌ Transaction was rejected by user. No modifications were made to the library catalog.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            execution_steps: [],
            replanned: false,
            human_approval_required: false,
          }
        ]);
      }
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset Library Catalog State
  const handleResetCatalog = async () => {
    try {
      const res = await fetch('/api/library/reset', { method: 'POST' });
      if (res.ok) {
        await refreshLibraryData();
        setSelectedBook(null);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: '🔄 Library catalog and loan transactions have been reset to factory defaults.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            execution_steps: [],
            replanned: false,
          }
        ]);
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Library size={22} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">CMRIT Library Agent</span>
              <span className="brand-badge font-mono">3D Autonomous</span>
            </div>
          </div>
        </div>

        {/* Live Catalog Stats */}
        {stats && (
          <div className="header-stats font-mono">
            <div className="stat-pill">
              <span style={{ color: 'var(--text-muted)' }}>Total:</span>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>{stats.total_books}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-dot green" />
              <span style={{ color: 'var(--text-muted)' }}>Available:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{stats.available_count}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-dot red" />
              <span style={{ color: 'var(--text-muted)' }}>Borrowed:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>{stats.borrowed_count}</span>
            </div>
          </div>
        )}

        <div className="header-actions">
          <button className="btn-secondary font-mono" onClick={handleResetCatalog} title="Reset catalog state">
            <RotateCcw size={14} />
            <span>Reset Demo</span>
          </button>
          <button
            className="btn-secondary"
            onClick={() => setIsFullscreen3D(!isFullscreen3D)}
            title={isFullscreen3D ? 'Split View' : 'Fullscreen 3D'}
          >
            {isFullscreen3D ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <div className="main-workspace">
        {/* 3D Scene Viewport */}
        <Library3DScene
          books={books}
          selectedBook={selectedBook}
          onSelectBook={(book) => setSelectedBook(book)}
          hoverFilter={hoverFilter}
        />

        {/* Right Panel: AI Agent Console & Catalog */}
        {!isFullscreen3D && (
          <aside className="agent-console-panel">
            {/* Panel Tabs */}
            <div className="panel-tabs">
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} />
                <span>Agent Console</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setActiveTab('catalog')}
              >
                <Layers size={16} />
                <span>Catalog Grid ({books.length})</span>
              </button>
            </div>

            {/* Tab 1: Agent Chat & Lifecycle Trace */}
            {activeTab === 'chat' && (
              <AgentChat
                messages={messages}
                onSendMessage={handleSendMessage}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={loading}
              />
            )}

            {/* Tab 2: Catalog Grid */}
            {activeTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      className="chat-input"
                      style={{ paddingLeft: '34px', width: '100%', fontSize: '0.8rem' }}
                      placeholder="Filter 3D books by title or category..."
                      value={hoverFilter}
                      onChange={(e) => setHoverFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="catalog-grid">
                  {books
                    .filter((b) => !hoverFilter || b.title.toLowerCase().includes(hoverFilter.toLowerCase()) || b.category.toLowerCase().includes(hoverFilter.toLowerCase()))
                    .map((book) => {
                      const palette = getCategoryPalette(book.category);
                      const isSelected = selectedBook && selectedBook.title === book.title;

                      return (
                        <div
                          key={book.id || book.title}
                          className="book-card-item"
                          style={{
                            borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-glass)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          }}
                          onClick={() => setSelectedBook(book)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: '0.65rem',
                                color: palette.accent,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}
                            >
                              {book.category}
                            </span>
                            <span className={`status-tag font-mono ${book.available ? 'available' : 'borrowed'}`}>
                              {book.available ? 'In Stock' : 'Borrowed'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', lineHeight: 1.3 }}>
                            {book.title}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {book.author}
                          </div>

                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBook(book);
                              }}
                            >
                              Inspect in 3D
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 3D Book Inspector Modal */}
      {selectedBook && (
        <BookInspectorModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onAction={(prompt) => {
            setActiveTab('chat');
            handleSendMessage(prompt);
          }}
        />
      )}
    </div>
  );
}
