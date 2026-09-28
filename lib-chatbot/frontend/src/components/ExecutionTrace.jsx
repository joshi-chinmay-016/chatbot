import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, CheckCircle2, AlertTriangle, Cpu, Wrench } from 'lucide-react';

export default function ExecutionTrace({ steps = [], replanned = false, replanReason = null }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!steps || steps.length === 0) return null;

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'GOAL_UNDERSTANDING':
        return <Activity size={14} className="text-cyan-400" />;
      case 'PLANNING':
        return <Cpu size={14} className="text-indigo-400" />;
      case 'TOOL_EXECUTION':
        return <Wrench size={14} className="text-purple-400" />;
      case 'EVALUATION':
        return <AlertTriangle size={14} className="text-amber-400" />;
      case 'RE_PLANNING':
        return <AlertTriangle size={14} className="text-rose-400" />;
      case 'ACTION':
        return <CheckCircle2 size={14} className="text-emerald-400" />;
      default:
        return <Activity size={14} />;
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
          {steps.map((step) => {
            const isFail = step.evaluation && step.evaluation.includes('FAIL');
            const isReplan = step.phase === 'RE_PLANNING';

            return (
              <div
                key={step.step_number}
                className={`trace-step phase-${step.phase}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getPhaseIcon(step.phase)}
                    <span className="step-phase-badge font-mono">
                      Step {step.step_number}: {step.phase}
                    </span>
                  </div>
                  {isFail && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                      VIOLATION
                    </span>
                  )}
                  {isReplan && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                      RE-PLANNING TRIGGERED
                    </span>
                  )}
                </div>

                <div className="step-action-text">{step.action}</div>

                {step.evaluation && (
                  <div
                    className="step-eval-text"
                    style={{ color: isFail ? '#fda4af' : '#94a3b8' }}
                  >
                    ↳ {step.evaluation}
                  </div>
                )}

                {step.reasoning && (
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                    "{step.reasoning}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
