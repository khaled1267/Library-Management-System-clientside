'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, BookOpen, Check, Clock3, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/components/providers';
import api from '@/lib/api';

export type ReturnRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type ReturnIssue = {
  _id: string;
  status: 'issued' | 'returned';
  issueDate: string;
  dueDate: string;
  returnedAt?: string;
  returnRequestStatus?: ReturnRequestStatus;
  returnRequestDate?: string;
  returnRequestReviewedAt?: string;
  returnRequestReason?: string;
  book?: { _id?: string; title?: string; coverUrl?: string; author?: { name?: string } };
  student?: { name?: string; userId?: string; department?: string; semester?: string; studentNumber?: string };
};

const errorMessage = (error: any) => error?.response?.data?.message || 'The return request could not be processed. Please try again.';
const dateLabel = (value?: string) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

export function ReturnRequestAction({ issue, onRequested }: { issue: ReturnIssue; onRequested?: (issueId: string) => void }) {
  const { notify } = useAuth();
  const [status, setStatus] = useState<ReturnRequestStatus>(issue.returnRequestStatus || 'none');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setStatus(issue.returnRequestStatus || 'none'), [issue._id, issue.returnRequestStatus]);

  useEffect(() => {
    if (!showConfirm) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) setShowConfirm(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showConfirm, submitting]);

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      await api.post(`/issues/${encodeURIComponent(issue._id)}/return-request`, {});
      setStatus('pending');
      setShowConfirm(false);
      notify('Return request submitted. Please hand the book to a librarian or administrator.');
      onRequested?.(issue._id);
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'pending') return <div className="return-request-state pending" role="status"><Clock3 size={14}/><span><b>Return request pending</b><small>Hand the book to a librarian or administrator.</small></span></div>;
  if (status === 'approved' || issue.status === 'returned') return <div className="return-request-state approved" role="status"><Check size={14}/><span><b>Return approved</b><small>{issue.returnedAt ? `Returned ${dateLabel(issue.returnedAt)}` : 'This book has been checked in.'}</small></span></div>;

  return <>
    {status === 'rejected' && <div className="return-request-rejection" role="status"><AlertCircle size={14}/><span><b>Request rejected</b><small>{issue.returnRequestReason?.trim() || 'You can submit a new request after reviewing the book with library staff.'}</small></span></div>}
    <button className="return-request-button" type="button" onClick={() => setShowConfirm(true)}><RotateCcw size={14}/>{status === 'rejected' ? 'Request Return Again' : 'Request Return'}</button>
    <AnimatePresence>
      {showConfirm && <motion.div className="return-request-dialog-scrim" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !submitting) setShowConfirm(false); }}>
        <motion.section className="return-request-dialog" role="dialog" aria-modal="true" aria-labelledby="student-return-title" aria-describedby="student-return-description" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .985 }} transition={{ duration: .18 }}>
          <button className="return-request-dialog-close" type="button" aria-label="Close return request confirmation" disabled={submitting} onClick={() => setShowConfirm(false)}><X size={17}/></button>
          <span className="return-request-dialog-icon"><RotateCcw size={20}/></span>
          <span className="dash-eyebrow">LIBRARY RETURN</span>
          <h2 id="student-return-title">Request to return this book?</h2>
          <p id="student-return-description"><b>{issue.book?.title || 'This book'}</b> will remain checked out until a librarian or administrator physically receives and approves the return.</p>
          <div className="return-request-dialog-note"><BookOpen size={16}/><span>Please bring the book to the library desk. Submitting this request does not make the copy available to other students.</span></div>
          <div className="return-request-dialog-actions"><button className="btn" type="button" disabled={submitting} onClick={() => setShowConfirm(false)}>Keep book</button><button className="btn dark" type="button" disabled={submitting} onClick={submitRequest}>{submitting ? 'Submitting…' : <>Confirm request <ArrowRight size={15}/></>}</button></div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>;
}

export function AdminReturnRequestsPanel({ onResolved }: { onResolved?: () => void }) {
  const { notify } = useAuth();
  const [requests, setRequests] = useState<ReturnIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ReturnIssue | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/return-requests', { params: { status: 'pending' } });
      setRequests(Array.isArray(response.data.requests) ? response.data.requests : []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRequests(); }, []);

  useEffect(() => {
    if (!decision) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) closeDialog(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [decision, submitting]);

  const closeDialog = () => { setDecision(null); setSelected(null); setReason(''); };
  const openDecision = (request: ReturnIssue, action: 'approve' | 'reject') => { setSelected(request); setDecision(action); setReason(''); };

  const reviewRequest = async () => {
    if (!selected || !decision || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/issues/${encodeURIComponent(selected._id)}/return-request/review`, { action: decision, ...(decision === 'reject' ? { reason } : {}) });
      notify(decision === 'approve' ? 'Return approved. Book stock has been updated.' : 'Return request rejected. The issue remains active.');
      setRequests(current => current.filter(request => request._id !== selected._id));
      closeDialog();
      onResolved?.();
    } catch (requestError) {
      notify(errorMessage(requestError), 'error');
      void loadRequests();
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="dash-panel return-requests-panel" aria-labelledby="return-requests-title">
    <header className="dash-panel-heading"><div><span className="dash-eyebrow">CIRCULATION DESK</span><h2 id="return-requests-title">Return requests</h2></div><span className="return-request-count">{loading ? '…' : requests.length}</span></header>
    {loading ? <div className="return-requests-empty" role="status"><span className="dashboard-spinner"/>Loading return requests…</div> : error ? <div className="return-requests-empty return-requests-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadRequests()}>Try again</button></div> : requests.length ? <div className="return-request-list">{requests.map(request => <article className="return-request-admin-card" key={request._id}>
      <div className="return-request-admin-book"><span className="return-request-admin-cover">{request.book?.coverUrl ? <img src={request.book.coverUrl} alt=""/> : <BookOpen size={18}/>}</span><div><b>{request.book?.title || 'Book unavailable'}</b><small>Borrowed {dateLabel(request.issueDate)} · Due {dateLabel(request.dueDate)}</small></div><span className="return-request-pending-pill">Pending</span></div>
      <div className="return-request-admin-student"><span><b>{request.student?.name || 'Student'}</b><small>{request.student?.userId || 'Library ID unavailable'}</small></span><span><small>Department</small><b>{request.student?.department || 'Not provided'}</b></span><span><small>Semester</small><b>{request.student?.semester || 'Not provided'}</b></span><span><small>Roll number</small><b>{request.student?.studentNumber || 'Not provided'}</b></span><span><small>Requested</small><b>{dateLabel(request.returnRequestDate)}</b></span></div>
      <div className="return-request-admin-actions"><button className="return-request-reject-button" type="button" onClick={() => openDecision(request, 'reject')}>Reject</button><button className="return-request-approve-button" type="button" onClick={() => openDecision(request, 'approve')}><Check size={14}/> Approve return</button></div>
    </article>)}</div> : <div className="return-requests-empty"><span className="return-request-empty-icon"><Check size={17}/></span><b>No pending return requests</b><small>Student requests will appear here after submission.</small></div>}

    <AnimatePresence>
      {decision && selected && <motion.div className="return-request-dialog-scrim" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !submitting) closeDialog(); }}>
        <motion.section className="return-request-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-return-title" aria-describedby="admin-return-description" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .985 }} transition={{ duration: .18 }}>
          <button className="return-request-dialog-close" type="button" aria-label="Close return decision" disabled={submitting} onClick={closeDialog}><X size={17}/></button>
          <span className={`return-request-dialog-icon ${decision}`}><Check size={20}/></span>
          <span className="dash-eyebrow">RETURN REQUEST REVIEW</span>
          <h2 id="admin-return-title">{decision === 'approve' ? 'Approve this return?' : 'Reject this request?'}</h2>
          <p id="admin-return-description"><b>{selected.book?.title || 'This book'}</b> · {selected.student?.name || 'Student'} ({selected.student?.userId || 'Library ID unavailable'})</p>
          {decision === 'approve' ? <div className="return-request-dialog-note"><Check size={16}/><span>Confirm only after you have physically received the book. Approval will close the issue and return one copy to available stock.</span></div> : <label className="return-request-reason-label">Rejection reason <span>Optional</span><textarea maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain what the student should do next…"/></label>}
          <div className="return-request-dialog-actions"><button className="btn" type="button" disabled={submitting} onClick={closeDialog}>Cancel</button><button className={`btn ${decision === 'approve' ? 'dark' : 'danger'}`} type="button" disabled={submitting} onClick={reviewRequest}>{submitting ? 'Saving…' : decision === 'approve' ? <>Approve return <ArrowRight size={15}/></> : 'Reject request'}</button></div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </section>;
}
