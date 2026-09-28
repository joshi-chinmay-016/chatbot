import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Sparkles,
  RotateCcw,
  Cpu,
  Layers,
  MessageSquare,
  Wrench,
  Maximize2,
  Minimize2,
  FolderOpen,
} from 'lucide-react';
import Study3DScene from './components/Study3DScene';
import AgentChat from './components/AgentChat';
import NotesExplorer from './components/NotesExplorer';
import QuickToolsCard from './components/QuickToolsCard';
import StudyNoteInspectorModal from './components/StudyNoteInspectorModal';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'notes' | 'tools'
  const [isFullscreen3D, setIsFullscreen3D] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial greeting message
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Welcome to the Autonomous 3D Study Assistant! I synthesize knowledge with zero hallucination using external tools:\n\n• 🔍 **Wikipedia API**: Real-time encyclopedic research on scientific concepts.\n• 🧮 **Scientific Calculator Engine**: Computes exact equations and formulas.\n• 📝 **3D Holographic Slates**: Generates interactive 3D study notes saved directly to `study_notes/`.\n\nInteract with the 3D Knowledge Nexus on the left, click the floating slates or polyhedra, or choose a study scenario above!',
      timestamp: '00:00',
      execution_steps: [],
      tools_used: [],
    },
  ]);

  // Fetch health check & notes on mount
  const refreshNotesData = async () => {
    try {
      const res = await fetch('/api/study/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  useEffect(() => {
    fetch('/api/study/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health check failed:', err));

    refreshNotesData();
  }, [notesRefreshKey]);

  // Handle User Message Submission
  const handleSendMessage = async (queryText) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: queryText,
        timestamp: timeStr,
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          execution_steps: data.execution_steps || [],
          tools_used: data.tools_used || [],
          saved_files: data.saved_files || [],
        },
      ]);

      // If new notes were saved, burst celebration confetti and refresh 3D scene!
      if (data.saved_files && data.saved_files.length > 0) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b'],
        });
        setNotesRefreshKey((k) => k + 1);
        refreshNotesData();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Apologies, encountered an agent execution error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          execution_steps: [],
          tools_used: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'agent',
        text: 'Chat history cleared. What topic or concept would you like to explore next?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        execution_steps: [],
        tools_used: [],
      },
    ]);
  };

  const handleDeleteNote = async (filename) => {
    try {
      const res = await fetch(`/api/study/notes/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedNote && selectedNote.filename === filename) {
          setSelectedNote(null);
        }
        refreshNotesData();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <BookOpen size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">StudyOS 3D</span>
              <span className="brand-badge font-mono">Agentic Nexus</span>
            </div>
          </div>
        </div>

        {/* Live LLM & Tool Indicators */}
        <div className="header-stats font-mono">
          {health && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="stat-pill"
                style={{
                  color: health.groq_configured ? 'var(--accent-emerald)' : 'var(--text-dim)',
                }}
              >
                <Cpu size={13} />
                <span>Groq Llama 3</span>
              </div>
              <div
                className="stat-pill"
                style={{
                  color: health.gemini_configured ? 'var(--accent-emerald)' : 'var(--text-dim)',
                }}
              >
                <Sparkles size={13} />
                <span>Gemini 2.5</span>
              </div>
            </div>
          )}

          <div className="stat-pill">
            <FolderOpen size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Slates:</span>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>{notes.length}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          <button
            className="btn-secondary font-mono"
            onClick={handleClearChat}
            title="Reset conversation"
          >
            <RotateCcw size={14} />
            <span>Reset Chat</span>
          </button>
          <button
            className="btn-secondary"
            onClick={() => setIsFullscreen3D(!isFullscreen3D)}
            title={isFullscreen3D ? 'Split View' : 'Fullscreen 3D Nexus'}
          >
            {isFullscreen3D ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <div className="main-workspace">
        {/* Left: 3D Holographic Knowledge Scene */}
        <Study3DScene
          notes={notes}
          selectedNote={selectedNote}
          onSelectNote={(note) => setSelectedNote(note)}
          onQuickPrompt={(prompt) => {
            setActiveTab('chat');
            handleSendMessage(prompt);
          }}
          isThinking={loading}
          filterQuery={searchQuery}
        />

        {/* Right: AI Agent Console & Workspace */}
        {!isFullscreen3D && (
          <aside className="agent-console-panel">
            {/* Panel Tabs */}
            <div className="panel-tabs">
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} />
                <span>Study Agent</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <Layers size={16} />
                <span>Notes Archive ({notes.length})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                onClick={() => setActiveTab('tools')}
              >
                <Wrench size={16} />
                <span>Tools Lab</span>
              </button>
            </div>

            {/* Tab 1: Agent Chat & Reasoning Trace */}
            {activeTab === 'chat' && (
              <AgentChat
                messages={messages}
                onSendMessage={handleSendMessage}
                onOpenNote={(note) => setSelectedNote(note)}
                loading={loading}
              />
            )}

            {/* Tab 2: Notes Explorer & Search */}
            {activeTab === 'notes' && (
              <NotesExplorer
                activeNote={selectedNote}
                onSelectNote={(fname) => {
                  const found = notes.find((n) => n.filename === fname);
                  if (found) setSelectedNote(found);
                }}
                onInspectNoteIn3D={(note) => setSelectedNote(note)}
                refreshKey={notesRefreshKey}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            )}

            {/* Tab 3: Tools Lab (Math & Wikipedia Scratchpad) */}
            {activeTab === 'tools' && (
              <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
                <QuickToolsCard
                  onRunPrompt={(p) => {
                    setActiveTab('chat');
                    handleSendMessage(p);
                  }}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 3D Holographic Note Inspector Modal */}
      {selectedNote && (
        <StudyNoteInspectorModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onAction={(prompt) => {
            setActiveTab('chat');
            handleSendMessage(prompt);
          }}
          onDelete={handleDeleteNote}
        />
      )}
    </div>
  );
}
