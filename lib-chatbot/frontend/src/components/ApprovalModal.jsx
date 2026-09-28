import React from 'react';
import { ShieldAlert, Check, X, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ApprovalModal({
  transaction = null,
  onApprove = () => {},
  onReject = () => {},
  loading = false,
}) {
  if (!transaction) return null;

  const handleApproveClick = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#6366f1', '#06b6d4'],
    });
    onApprove(transaction.transaction_id);
  };

  const isBorrow = transaction.type === 'borrow' || transaction.action_type === 'borrow';

  return (
    <div className="approval-card">
      <div className="approval-title">
        <ShieldAlert size={18} style={{ color: 'var(--accent-amber)' }} />
        <span>Human-in-the-Loop Authorization Required</span>
      </div>

      <div className="approval-desc">
        The agent has prepared a <strong>{isBorrow ? 'Loan Record' : 'Return Record'}</strong> for{' '}
        <span style={{ color: '#ffffff', fontWeight: 600 }}>"{transaction.target_book || transaction.book_title}"</span>.
        Autonomous safety policy mandates explicit human approval before modifying library inventory.
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.75rem' }} className="font-mono">
        <div><strong>Transaction ID:</strong> {transaction.transaction_id}</div>
        <div><strong>Action:</strong> {isBorrow ? 'BORROW_CHECKOUT' : 'RETURN_CHECKIN'}</div>
      </div>

      <div className="approval-btn-group">
        <button
          className="btn-approve"
          onClick={handleApproveClick}
          disabled={loading}
        >
          <Check size={16} />
          <span>Authorize Action</span>
        </button>

        <button
          className="btn-reject"
          onClick={() => onReject(transaction.transaction_id)}
          disabled={loading}
        >
          <X size={16} />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}
