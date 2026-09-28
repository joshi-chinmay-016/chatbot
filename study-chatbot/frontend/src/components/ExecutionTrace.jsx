import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Wrench, CheckCircle2, Cpu, FileText } from 'lucide-react';

export default function ExecutionTrace({ steps = [] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!steps || steps.length === 0) return null;

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'GOAL_UNDERSTANDING':
        return <Activity size={14} style={{ color: 'var(--accent-cyan)' }} />;
      case 'TOOL_EXECUTION':
        return <Wrench size={14} style={{ color: 'var(--accent-purple)' }} />;
      case 'ACTION':
        return <FileText size={14} style={{ color: 'var(--accent-amber)' }} />;
      case 'SYNTHESIS':
        return <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />;
      default:
        return <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />;
    }
  };

  return (
    <div className="trace-container">
      <div
        className="trace-header"
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={15} style={{ color: 'var(--accent-primary)' }} />
          <span>Autonomous Execution Trace ({steps.length} Steps)</span>
        </div>
        <div>
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {!collapsed && (
        <div className="trace-list">
          {steps.map((step) => (
            <div key={step.step_number} className={`trace-step phase-${step.phase}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getPhaseIcon(step.phase)}
                  <span className="step-phase-badge font-mono">
                    Step {step.step_number}: {step.phase}
                  </span>
                </div>
                {step.tool_name && (
                  <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>
                    tool: {step.tool_name}()
                  </span>
                )}
              </div>

              <div className="step-action-text">{step.action}</div>

              {step.observation && (
                <div className="step-eval-text">
                  ↳ <strong>Obs:</strong>{' '}
                  {typeof step.observation === 'object'
                    ? JSON.stringify(step.observation)
                    : String(step.observation)}
                </div>
              )}

              {step.evaluation && (
                <div style={{ fontSize: '0.7rem', color: '#6ee7b7', marginTop: '3px' }} className="font-mono">
                  ✓ {step.evaluation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
