import React, { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Plan a 3-day trip to Goa from Bangalore under ₹15,000');
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [error, setError] = useState(null);

  const handlePlanTrip = async (queryText) => {
    const query = queryText || message;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setApprovalStatus(null);
    setApprovalMessage('');

    try {
      const res = await fetch('/api/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setAgentData(data);
      setApprovalStatus(data.status);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to communicate with agent backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action) => {
    if (!agentData?.trip_id) return;

    try {
      const res = await fetch('/api/travel/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: agentData.trip_id,
          action: action,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to submit approval: ${res.statusText}`);
      }

      const data = await res.json();
      setApprovalStatus(data.status);
      setApprovalMessage(data.authorized_action || data.message);
    } catch (err) {
      console.error(err);
      alert('Error updating approval status: ' + err.message);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <span className="badge badge-tag">Class Activity Demo</span>
        <h1>Autonomous Travel Agent</h1>
        <p>
          Demonstrating Goal Understanding, Planning, Tool Execution, Reasoning,
          Re-planning, and Human-in-the-Loop Approval.
        </p>
      </header>

      {/* Demo Scenario Buttons */}
      <div className="demo-bar">
        <button
          className="demo-btn"
          onClick={() => {
            const q = 'Plan a 3-day trip to Goa from Bangalore under ₹15,000';
            setMessage(q);
            handlePlanTrip(q);
          }}
        >
          Scenario 1: Standard Trip (₹15,000 Budget)
        </button>
        <button
          className="demo-btn"
          onClick={() => {
            const q = 'Plan a 3-day trip to Goa from Bangalore under ₹10,000 with flights';
            setMessage(q);
            handlePlanTrip(q);
          }}
        >
          Scenario 2: Failure & Re-planning Demo (₹10,000 with Flights)
        </button>
      </div>

      {/* Input Form */}
      <div className="input-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePlanTrip();
          }}
          className="input-group"
        >
          <input
            type="text"
            className="input-box"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Plan a 3-day trip to Goa from Bangalore under ₹15,000"
            disabled={loading}
          />
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Agent Thinking...' : 'Execute Agent'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rejected-banner" style={{ marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="loading-box">
          <div className="spinner"></div>
          <p>Running autonomous agent execution loop...</p>
        </div>
      )}

      {/* Agent Results */}
      {!loading && agentData && (
        <div>
          {/* Re-planning Alert Banner if triggered */}
          {agentData.replanned && (
            <div className="replan-banner">
              <div className="replan-icon">↻</div>
              <div className="replan-content">
                <h4>Autonomous Re-planning Triggered!</h4>
                <p>{agentData.replan_reason}</p>
              </div>
            </div>
          )}

          {/* Goal & Constraints */}
          <div className="input-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title">🎯 Goal & Identified Constraints</h3>
            <p style={{ marginBottom: '0.75rem', fontWeight: 500, color: '#e2e8f0' }}>
              {agentData.goal}
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#94a3b8' }}>
              <span>Origin: <strong style={{ color: '#fff' }}>{agentData.constraints.origin}</strong></span>
              <span>Destination: <strong style={{ color: '#fff' }}>{agentData.constraints.destination}</strong></span>
              <span>Duration: <strong style={{ color: '#fff' }}>{agentData.constraints.duration_days} Days</strong></span>
              <span>Budget: <strong style={{ color: '#38bdf8' }}>₹{agentData.constraints.budget.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Execution Trace / Timeline */}
          <div className="steps-container">
            <h3 className="section-title">⚙️ Agent Execution Lifecycle Trace</h3>
            {agentData.execution_steps.map((step) => (
              <div key={step.step_number} className="step-item">
                <div className="step-dot"></div>
                <div className="step-header">
                  <span className="step-phase">{step.phase}</span>
                  <span className="step-number">Step {step.step_number}</span>
                </div>
                <div className="step-action">{step.action}</div>
                {step.reasoning && (
                  <div className="step-reasoning">
                    <strong>Reasoning:</strong> {step.reasoning}
                  </div>
                )}
                {step.evaluation && (
                  <div>
                    <span
                      className={`step-evaluation ${
                        step.evaluation.includes('PASS') || step.evaluation.includes('SUCCESS')
                          ? 'eval-pass'
                          : step.evaluation.includes('FAIL')
                          ? 'eval-fail'
                          : 'eval-info'
                      }`}
                    >
                      {step.evaluation}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final Plan & Cost Breakdown */}
          <div className="final-plan-card">
            <h3 className="section-title">📋 Final Travel Plan</h3>

            <div className="plan-grid">
              <div className="plan-box">
                <h4>Selected Transport</h4>
                <p><strong>Mode:</strong> {agentData.final_plan.transport.type}</p>
                <p><strong>Details:</strong> {agentData.final_plan.transport.details}</p>
                <p><strong>Cost:</strong> ₹{agentData.final_plan.breakdown.transport.toLocaleString()} (Round Trip)</p>
              </div>

              <div className="plan-box">
                <h4>Selected Hotel</h4>
                <p><strong>Hotel:</strong> {agentData.final_plan.hotel.name}</p>
                <p><strong>Tier:</strong> {agentData.final_plan.hotel.tier}</p>
                <p><strong>Duration:</strong> {agentData.final_plan.hotel.nights} Nights</p>
                <p><strong>Cost:</strong> ₹{agentData.final_plan.breakdown.hotel.toLocaleString()}</p>
              </div>
            </div>

            {/* Itinerary */}
            <h4 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '1rem' }}>Day-by-Day Itinerary</h4>
            <div className="itinerary-list">
              {agentData.final_plan.itinerary.map((day) => (
                <div key={day.day} className="itinerary-day">
                  <h5>{day.title}</h5>
                  <ul>
                    <li><strong>Morning:</strong> {day.morning}</li>
                    <li><strong>Afternoon:</strong> {day.afternoon}</li>
                    <li><strong>Evening:</strong> {day.evening}</li>
                  </ul>
                </div>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="cost-summary">
              <div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Estimated Cost</p>
                <p className="cost-total">₹{agentData.total_cost.toLocaleString()}</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8' }}>
                <p>User Budget: ₹{agentData.constraints.budget.toLocaleString()}</p>
                <p style={{ color: '#10b981', fontWeight: 600 }}>
                  Remaining Margin: ₹{(agentData.constraints.budget - agentData.total_cost).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Human-in-the-Loop Section */}
            <div className="approval-box">
              {approvalStatus === 'awaiting_approval' && (
                <>
                  <div className="approval-prompt">⚠️ Human Approval Required</div>
                  <div className="approval-subtext">
                    The agent has synthesized the plan and verified budget constraints.
                    No booking or authorized action will occur until you review and confirm.
                  </div>
                  <div className="approval-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleApproval('approve')}
                    >
                      ✓ Approve Plan
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleApproval('reject')}
                    >
                      ✕ Reject Plan
                    </button>
                  </div>
                </>
              )}

              {approvalStatus === 'approved' && (
                <div className="authorized-banner">
                  <h4>✅ Plan Approved & Booking Authorized!</h4>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    {approvalMessage || 'The agent has executed the final authorized booking action.'}
                  </p>
                </div>
              )}

              {approvalStatus === 'rejected' && (
                <div className="rejected-banner">
                  <h4>✕ Plan Rejected</h4>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    The user declined the plan. No bookings were made.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
