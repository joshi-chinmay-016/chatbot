import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  Bot,
  ExternalLink,
  Calculator,
  Layers,
  Clock,
} from 'lucide-react';
import { getSubjectCategory, getSubjectPalette } from './StudySlate3D';

export default function StudyNoteInspectorModal({
  note,
  onClose = () => {},
  onAction = () => {},
  onDelete = () => {},
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const miniMountRef = useRef(null);

  const subject = getSubjectCategory(note?.filename || '', note?.preview || '');
  const palette = getSubjectPalette(subject);

  // Fetch full note content
  useEffect(() => {
    if (!note || !note.filename) return;
    setLoading(true);
    fetch(`/api/study/notes/${encodeURIComponent(note.filename)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Note not found');
        return res.json();
      })
      .then((data) => {
        setContent(data.content);
      })
      .catch((err) => {
        console.error('Failed to load note content:', err);
        setContent(note.preview || 'No content preview available.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [note]);

  // Mini 3D Rotating Slate Preview in modal
  useEffect(() => {
    const container = miniMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Light
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambLight);

    const ptLight = new THREE.PointLight(palette.glow, 3, 10);
    ptLight.position.set(2, 3, 4);
    scene.add(ptLight);

    // 3D Mini Slate Mesh
    const geom = new THREE.BoxGeometry(1.9, 2.7, 0.1);
    const slateMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.dark),
      roughness: 0.2,
      metalness: 0.8,
      emissive: new THREE.Color(palette.glow),
      emissiveIntensity: 0.2,
    });
    const slateMesh = new THREE.Mesh(geom, slateMat);
    scene.add(slateMesh);

    // Wireframe edge
    const wireGeom = new THREE.BoxGeometry(1.94, 2.74, 0.12);
    const wireMat = new THREE.MeshBasicMaterial({
      color: palette.glow,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    scene.add(wireMesh);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      slateMesh.rotation.y += 0.015;
      slateMesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.15;
      wireMesh.rotation.copy(slateMesh.rotation);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [palette]);

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', note.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const wordsCount = content ? content.trim().split(/\s+/).length : 0;
  const linesCount = content ? content.split('\n').length : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="inspector-modal glass-panel-elevated" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ background: palette.dark, borderColor: palette.primary }}>
              <FileText size={18} style={{ color: palette.accent }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ fontSize: '0.72rem', color: palette.accent, fontWeight: 700 }}>
                  ◆ {subject.toUpperCase()}
                </span>
                <span className="status-tag font-mono available">Synchronized</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0, fontWeight: 700 }}>
                {note.filename}
              </h3>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="inspector-body">
          {/* Left Column: 3D Holographic Preview & Metadata */}
          <div className="inspector-sidebar">
            <div className="mini-3d-container" ref={miniMountRef} />
            <div className="inspector-metrics font-mono">
              <div className="metric-row">
                <span className="label">Category:</span>
                <span className="value" style={{ color: palette.accent }}>{subject}</span>
              </div>
              <div className="metric-row">
                <span className="label">Words:</span>
                <span className="value">{wordsCount}</span>
              </div>
              <div className="metric-row">
                <span className="label">Lines:</span>
                <span className="value">{linesCount}</span>
              </div>
              <div className="metric-row">
                <span className="label">Path:</span>
                <span className="value" style={{ fontSize: '0.65rem' }}>study_notes/{note.filename}</span>
              </div>
            </div>

            {/* AI Action Prompts */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}
                onClick={() => {
                  onAction(`Expand upon the notes in ${note.filename}, explain the core principles thoroughly with examples, and generate a 3-question quiz for me.`);
                  onClose();
                }}
              >
                <Sparkles size={14} />
                <span>Deep Dive with AI</span>
              </button>

              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}
                onClick={() => {
                  onAction(`Verify all equations and dates in ${note.filename} using Wikipedia and the Calculator tool.`);
                  onClose();
                }}
              >
                <Calculator size={14} />
                <span>Verify Math / Facts</span>
              </button>
            </div>
          </div>

          {/* Right Column: Markdown Note Viewer */}
          <div className="inspector-content-pane">
            <div className="content-toolbar">
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Markdown Content Viewer
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-secondary font-mono" style={{ fontSize: '0.72rem', padding: '4px 8px' }} onClick={handleCopy}>
                  {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button className="btn-secondary font-mono" style={{ fontSize: '0.72rem', padding: '4px 8px' }} onClick={handleDownload}>
                  <Download size={12} />
                  <span>Export</span>
                </button>
                <button
                  className="btn-secondary font-mono"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', color: 'var(--accent-rose)' }}
                  onClick={() => {
                    if (window.confirm(`Delete ${note.filename} from disk?`)) {
                      onDelete(note.filename);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading note content...
              </div>
            ) : (
              <div className="note-markdown-view">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {content}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
