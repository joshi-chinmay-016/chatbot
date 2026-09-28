import React, { useState, useEffect } from 'react';
import {
  FileText,
  RefreshCw,
  Trash2,
  Download,
  Copy,
  Check,
  Eye,
  X,
  Plus,
  Search,
  Sparkles,
  Maximize2,
  FolderOpen,
} from 'lucide-react';
import { getSubjectCategory, getSubjectPalette } from './StudySlate3D';

export default function NotesExplorer({
  activeNote = null,
  onSelectNote = () => {},
  onInspectNoteIn3D = () => {},
  refreshKey = 0,
  searchQuery = '',
  onSearchChange = () => {},
}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/study/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshKey]);

  const handleDeleteNote = async (filename, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete '${filename}' from study_notes/?`)) return;
    try {
      const res = await fetch(`/api/study/notes/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newFilename.trim() || !newContent.trim()) return;
    let fname = newFilename.trim();
    if (!fname.endsWith('.md')) fname += '.md';

    try {
      const res = await fetch('/api/study/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fname, content: newContent }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewFilename('');
        setNewContent('');
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const categories = ['All', 'Physics', 'Mathematics', 'Computing & AI', 'Astronomy', 'Chemistry & Biology'];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.preview && n.preview.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory === 'All') return true;

    const cat = getSubjectCategory(n.filename, n.preview);
    return cat.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header Bar */}
      <div className="notes-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpen size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
            Study Archives
          </span>
          <span className="brand-badge font-mono" style={{ fontSize: '0.65rem' }}>
            {notes.length} Files
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
            onClick={() => setShowCreateModal(true)}
            title="Create new markdown note"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
          <button
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
            onClick={fetchNotes}
            title="Refresh from disk"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin-slow' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '11px',
              color: 'var(--text-dim)',
            }}
          />
          <input
            type="text"
            className="chat-input font-mono"
            style={{ paddingLeft: '32px', width: '100%', fontSize: '0.78rem', height: '36px' }}
            placeholder="Search notes or 3D slates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '9px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div
          style={{
            display: 'flex',
            gap: '5px',
            overflowX: 'auto',
            paddingTop: '8px',
            paddingBottom: '2px',
          }}
          className="hide-scrollbar"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-chip font-mono ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid / List */}
      <div className="notes-scroll-area">
        {filteredNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            {notes.length === 0
              ? 'No study notes found. Ask the agent in the chat to research and persist notes!'
              : 'No notes match your active query or subject filter.'}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const subject = getSubjectCategory(note.filename, note.preview);
            const palette = getSubjectPalette(subject);

            return (
              <div
                key={note.filename}
                className="note-item-card"
                onClick={() => onInspectNoteIn3D(note)}
                style={{
                  borderLeft: `3px solid ${palette.primary}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: palette.accent,
                      textTransform: 'uppercase',
                    }}
                  >
                    ◆ {subject}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {(note.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="note-item-title" style={{ marginTop: '4px' }}>
                  <FileText size={14} style={{ color: palette.accent, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.filename}
                  </span>
                </div>

                <div className="note-item-preview font-mono">
                  {note.preview || 'Revision notes and formulas compiled autonomously.'}
                </div>

                <div className="note-item-meta font-mono" style={{ marginTop: '8px' }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '3px 8px', borderColor: palette.primary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectNoteIn3D(note);
                    }}
                  >
                    <Eye size={11} />
                    <span>3D Inspect</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => handleDeleteNote(note.filename, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Create Note Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="glass-panel-elevated"
            style={{ width: '90%', maxWidth: '480px', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontWeight: 700, color: '#ffffff' }}>Create New Study Note</span>
              </div>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNote}>
              <div style={{ marginBottom: '12px' }}>
                <label className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Filename (e.g. quantum_mechanics.md)
                </label>
                <input
                  type="text"
                  className="chat-input"
                  style={{ width: '100%' }}
                  placeholder="topic_name.md"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Markdown Content
                </label>
                <textarea
                  className="chat-input"
                  style={{ width: '100%', height: '140px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  placeholder="# Concept Title&#10;&#10;- Key principle 1&#10;- Formula: E = mc^2"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
