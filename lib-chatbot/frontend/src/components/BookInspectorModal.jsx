import React from 'react';
import { X, BookOpen, User, Tag, MapPin, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { getCategoryPalette } from './Book3D';

export default function BookInspectorModal({
  book = null,
  onClose = () => {},
  onAction = () => {},
}) {
  if (!book) return null;

  const palette = getCategoryPalette(book.category);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-panel-elevated inspector-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${palette.main}, ${palette.dark})`,
                border: `2px solid ${palette.accent}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
              }}
            >
              <BookOpen size={22} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                {book.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: palette.accent, fontWeight: 600 }}>
                {book.category}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} />
              <span>Author</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
              {book.author}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} />
              <span>Shelf Location</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
              {book.shelf_row === 1 ? 'Top Shelf' : 'Bottom Shelf'} (Bay {book.shelf_col + 1})
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: book.available ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${book.available ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {book.available ? (
              <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
            ) : (
              <AlertCircle size={18} style={{ color: 'var(--accent-rose)' }} />
            )}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: book.available ? '#6ee7b7' : '#fda4af' }}>
                {book.available ? 'In Stock on 3D Shelf' : 'Currently Borrowed'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {book.available ? 'Ready for immediate student checkout.' : 'Available for return or autonomous alternative suggestion.'}
              </div>
            </div>
          </div>

          <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            ID: {book.id || 'b-ref'}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {book.available ? (
            <button
              className="btn-primary"
              style={{ justifyContent: 'center', width: '100%', padding: '12px' }}
              onClick={() => {
                onAction(`I want to borrow ${book.title}`);
                onClose();
              }}
            >
              <BookOpen size={16} />
              <span>Borrow This Book</span>
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{
                justifyContent: 'center',
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, var(--accent-rose), #9f1239)',
              }}
              onClick={() => {
                onAction(`I am returning ${book.title}`);
                onClose();
              }}
            >
              <CheckCircle size={16} />
              <span>Return This Book to Shelf</span>
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ justifyContent: 'center', width: '100%', padding: '10px' }}
            onClick={() => {
              onAction(`Tell me about ${book.title} and recommend similar books in ${book.category}`);
              onClose();
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Ask Agent for Recommendations</span>
          </button>
        </div>
      </div>
    </div>
  );
}
