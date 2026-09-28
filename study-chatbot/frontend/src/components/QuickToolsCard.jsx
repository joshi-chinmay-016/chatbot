import React, { useState } from 'react';
import {
  Globe,
  Calculator,
  FileText,
  Play,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function QuickToolsCard({ onRunPrompt = () => {} }) {
  // Calculator state
  const [calcExpr, setCalcExpr] = useState('sqrt(2 * 9.8 * 6371000)');
  const [calcResult, setCalcResult] = useState('11174.542496');
  const [calcLoading, setCalcLoading] = useState(false);

  // Wiki state
  const [wikiQuery, setWikiQuery] = useState('Quantum superposition');
  const [wikiResult, setWikiResult] = useState(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState('calc'); // 'calc' | 'wiki'

  const handleQuickCalc = async (e) => {
    e.preventDefault();
    if (!calcExpr.trim()) return;
    setCalcLoading(true);
    try {
      const res = await fetch('/api/study/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: calcExpr.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data.success ? data.result : data.error || 'Syntax Error');
      }
    } catch (err) {
      setCalcResult('Calc Engine Error');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleWikiSearch = async (e) => {
    e.preventDefault();
    if (!wikiQuery.trim()) return;
    setWikiLoading(true);
    try {
      const res = await fetch(`/api/study/search?query=${encodeURIComponent(wikiQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setWikiResult(data.results && data.results.length > 0 ? data.results[0] : null);
      }
    } catch (err) {
      setWikiResult(null);
    } finally {
      setWikiLoading(false);
    }
  };

  return (
    <div className="tools-card">
      {/* Registered Tools Indicator Bar */}
      <div className="tools-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>Autonomous Tool Matrix</span>
        </div>
      </div>

      <div className="tools-grid">
        <div className="tool-chip" onClick={() => setActiveSubTab('wiki')}>
          <div className="tool-chip-name">
            <Globe size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Wikipedia API</span>
          </div>
          <div className="tool-chip-desc">Live Encyclopedic Query</div>
        </div>

        <div className="tool-chip" onClick={() => setActiveSubTab('calc')}>
          <div className="tool-chip-name">
            <Calculator size={13} style={{ color: 'var(--accent-emerald)' }} />
            <span>Math Engine</span>
          </div>
          <div className="tool-chip-desc">Zero-hallucination math</div>
        </div>

        <div className="tool-chip">
          <div className="tool-chip-name">
            <FileText size={13} style={{ color: 'var(--accent-amber)' }} />
            <span>study_notes/</span>
          </div>
          <div className="tool-chip-desc">Disk persistence & 3D</div>
        </div>
      </div>

      {/* Subtab Switcher */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
        <button
          className={`filter-chip font-mono ${activeSubTab === 'calc' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('calc')}
        >
          🧮 Math Scratchpad
        </button>
        <button
          className={`filter-chip font-mono ${activeSubTab === 'wiki' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('wiki')}
        >
          🔍 Live Wiki Explorer
        </button>
      </div>

      {/* Mode 1: Instant Math Calculator */}
      {activeSubTab === 'calc' && (
        <form onSubmit={handleQuickCalc} className="calculator-scratchpad" style={{ marginTop: '10px' }}>
          <Calculator size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          <input
            type="text"
            className="calc-input font-mono"
            placeholder="e.g. sqrt(144)*5, 2^10, 1643 + 300"
            value={calcExpr}
            onChange={(e) => setCalcExpr(e.target.value)}
          />
          <button
            type="submit"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            title="Evaluate"
            disabled={calcLoading}
          >
            <Play size={13} />
          </button>
          {calcResult && (
            <span className="calc-result font-mono" title={calcResult}>
              = {calcResult}
            </span>
          )}
        </form>
      )}

      {/* Mode 2: Live Wikipedia Search */}
      {activeSubTab === 'wiki' && (
        <div style={{ marginTop: '10px' }}>
          <form onSubmit={handleWikiSearch} className="calculator-scratchpad">
            <Search size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
            <input
              type="text"
              className="calc-input font-mono"
              placeholder="Search topic e.g. Quantum entanglement"
              value={wikiQuery}
              onChange={(e) => setWikiQuery(e.target.value)}
            />
            <button
              type="submit"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Search"
              disabled={wikiLoading}
            >
              <Play size={13} />
            </button>
          </form>

          {wikiResult && (
            <div
              className="glass-panel"
              style={{
                marginTop: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>{wikiResult.title}</strong>
                {wikiResult.url && (
                  <a
                    href={wikiResult.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                {wikiResult.snippet || wikiResult.summary || 'Wikipedia encyclopedic article retrieved.'}
              </div>
              <button
                className="btn-secondary font-mono"
                style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: '6px' }}
                onClick={() =>
                  onRunPrompt(`Explain ${wikiResult.title} in depth and compile notes to ${wikiResult.title.toLowerCase().replace(/\s+/g, '_')}.md`)
                }
              >
                <span>Study this concept in Chat</span>
                <ChevronRight size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
