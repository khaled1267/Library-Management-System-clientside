'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Library, Moon, RefreshCw, Sun, X } from 'lucide-react';
import { useAuth } from '@/components/providers';
import api from '@/lib/api';

type BookDetails = {
  _id: string;
  title: string;
  author?: { name?: string };
  category?: { name?: string };
  isbn?: string;
  coverUrl?: string;
  description?: string;
  publishedYear?: number;
  publishedDate?: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  availabilityStatus: 'Available' | 'Busy' | 'Unavailable';
};

type Borrower = {
  issueId: string;
  student: { name: string; userId: string; semester: string; rollNumber: string; department: string };
  issueDate: string;
  dueDate: string;
};

const errorMessage = (error: any) => error?.response?.data?.message || 'We could not load this book. Please try again.';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function BookCover({ book }: { book: BookDetails }) {
  return <div className="book-detail-cover">{book.coverUrl ? <img src={book.coverUrl} alt={`Cover of ${book.title}`} onError={event => { event.currentTarget.hidden = true; }}/> : <div className="book-detail-cover-fallback"><BookOpen size={46}/><span>LIBRARY COLLECTION</span></div>}{book.coverUrl && <div className="book-detail-cover-fallback book-detail-cover-fallback-behind"><BookOpen size={46}/><span>LIBRARY COLLECTION</span></div>}</div>;
}

export default function BookDetailsClient({ bookId }: { bookId: string }) {
  const { user, isInitializing, notify } = useAuth();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [borrowersLoading, setBorrowersLoading] = useState(false);
  const [borrowersError, setBorrowersError] = useState('');
  const [confirmBorrow, setConfirmBorrow] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState(false);
  const [checkingLoan, setCheckingLoan] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const dialogRef = useRef<HTMLElement>(null);
  const borrowTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const backHref = isAdmin ? '/admin/books' : user?.role === 'student' ? '/student/books' : '/';

  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem('library-theme') === 'dark' ? 'dark' : 'light');
    syncTheme();
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('library-theme', nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    api.get(`/books/${encodeURIComponent(bookId)}/availability`).then(response => {
      if (active && response.data.book) setBook(response.data.book);
      else if (active) setNotFound(true);
    }).catch(requestError => {
      if (!active) return;
      if (requestError?.response?.status === 400 || requestError?.response?.status === 404) setNotFound(true);
      else setError(errorMessage(requestError));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookId]);

  useEffect(() => {
    let active = true;
    if (!book || !isAdmin) {
      setBorrowers([]);
      setBorrowersError('');
      setBorrowersLoading(false);
      return () => { active = false; };
    }
    setBorrowersLoading(true);
    setBorrowersError('');
    api.get(`/books/${encodeURIComponent(bookId)}/borrowers`).then(response => {
      if (active) setBorrowers(Array.isArray(response.data.borrowers) ? response.data.borrowers : []);
    }).catch(requestError => {
      if (active) setBorrowersError(errorMessage(requestError));
    }).finally(() => { if (active) setBorrowersLoading(false); });
    return () => { active = false; };
  }, [book, bookId, isAdmin]);

  useEffect(() => {
    let active = true;
    if (!book || !isStudent || isInitializing) {
      setAlreadyBorrowed(false);
      setCheckingLoan(false);
      return () => { active = false; };
    }
    setCheckingLoan(true);
    api.get('/issues', { params: { status: 'issued' } }).then(response => {
      if (active) setAlreadyBorrowed((response.data.issues || []).some((issue: { book?: { _id?: string } | string }) => String(typeof issue.book === 'string' ? issue.book : issue.book?._id) === bookId));
    }).catch(() => { if (active) setAlreadyBorrowed(false); }).finally(() => { if (active) setCheckingLoan(false); });
    return () => { active = false; };
  }, [book, bookId, isInitializing, isStudent]);

  useEffect(() => {
    if (!confirmBorrow) return;
    confirmButtonRef.current?.focus();
    const manageDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !borrowing) setConfirmBorrow(false);
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', manageDialogKeys);
    return () => {
      window.removeEventListener('keydown', manageDialogKeys);
      if (document.activeElement !== borrowTriggerRef.current) borrowTriggerRef.current?.focus();
    };
  }, [confirmBorrow, borrowing]);

  const borrowBook = async () => {
    if (!book || !isStudent || book.availableCopies < 1 || borrowing) return;
    setBorrowing(true);
    try {
      const result = await api.post('/issues', { bookId: book._id, selfService: true });
      setAlreadyBorrowed(true);
      setConfirmBorrow(false);
      const dueDate = result.data.issue?.dueDate ? formatDate(result.data.issue.dueDate) : 'in 14 days';
      notify(`Book borrowed successfully. Due ${dueDate}.`);
      try {
        const refreshed = await api.get(`/books/${encodeURIComponent(bookId)}/availability`);
        if (refreshed.data.book) setBook(refreshed.data.book);
      } catch {
        notify('Your book was borrowed, but availability could not refresh. Reload this page to see the latest count.', 'error');
      }
    } catch (requestError: any) {
      if (requestError?.response?.status === 401) notify('Your session expired. Sign in again to borrow this book.', 'error');
      else notify(errorMessage(requestError), 'error');
      if (requestError?.response?.status === 409) {
        try {
          const [refreshed, issues] = await Promise.all([
            api.get(`/books/${encodeURIComponent(bookId)}/availability`),
            api.get('/issues', { params: { status: 'issued' } }),
          ]);
          if (refreshed.data.book) setBook(refreshed.data.book);
          setAlreadyBorrowed((issues.data.issues || []).some((issue: { book?: { _id?: string } | string }) => String(typeof issue.book === 'string' ? issue.book : issue.book?._id) === bookId));
        } catch { /* Keep the server's conflict message visible. */ }
      }
    } finally {
      setBorrowing(false);
    }
  };

  const status = book?.availabilityStatus || 'Unavailable';
  const publishedYear = book?.publishedYear || (book?.publishedDate ? Number.parseInt(book.publishedDate.slice(0, 4), 10) : undefined);

  return <main className="book-detail-page" data-theme={theme}>
    <header className="book-detail-topbar"><Link className="book-detail-brand" href="/"><span><Library size={18}/></span><b>Barguna Politechnic Institute <small>COLLEGE LIBRARY</small></b></Link><div className="book-detail-top-actions"><button className="book-detail-theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button><Link className="book-detail-back" href={backHref}><ArrowLeft size={15}/> Back to books</Link></div></header>
    {loading ? <section className="book-detail-state" role="status" aria-live="polite"><span className="book-detail-spinner"><RefreshCw size={21}/></span><b>Loading book details</b><span>Checking the catalog and current availability…</span></section> : error ? <section className="book-detail-state book-detail-error" role="alert"><span className="book-detail-state-icon"><BookOpen size={23}/></span><h1>Book details unavailable</h1><p>{error}</p><button className="btn dark" type="button" onClick={() => window.location.reload()}>Try again <ArrowRight size={15}/></button></section> : notFound || !book ? <section className="book-detail-state" role="status"><span className="book-detail-state-icon"><BookOpen size={23}/></span><span className="availability-badge unavailable">Unavailable</span><h1>Book Unavailable</h1><p>This book is not in the library catalog. Check the link or return to the books list.</p><Link className="btn dark" href={backHref}>Back to books <ArrowRight size={15}/></Link></section> : <>
      <div className="book-detail-crumb"><Link href={backHref}>Books</Link><span>/</span><span>{book.title}</span></div>
      <section className="book-detail-hero">
        <BookCover book={book}/>
        <div className="book-detail-summary">
          <span className="eyebrow">LIBRARY COLLECTION</span>
          <span className={`availability-badge ${status.toLowerCase()}`}>{status}</span>
          <h1>{book.title}</h1>
          <p className="book-detail-author">by {book.author?.name || 'Author unavailable'}</p>
          <div className="book-detail-tags"><span>{book.category?.name || 'Uncategorized'}</span>{book.isbn && <span>ISBN {book.isbn}</span>}{publishedYear && <span>Published {publishedYear}</span>}</div>
          <p className="book-detail-description">{book.description?.trim() || 'No description is available for this title.'}</p>
          <div className="book-detail-actions">
            <Link className="btn dark" href={backHref}><ArrowLeft size={15}/> Back to books</Link>
            {isStudent && <>
              {book.availableCopies < 1 ? <button className="btn dark borrow-book-action" type="button" disabled>Currently Busy</button> : alreadyBorrowed ? <Link className="btn borrow-book-action borrow-book-owned" href="/student/my-books"><Check size={15}/> Already borrowed · View my books</Link> : <button className="btn dark borrow-book-action" type="button" ref={borrowTriggerRef} disabled={isInitializing || checkingLoan || borrowing} onClick={() => setConfirmBorrow(true)}>
                {borrowing ? <><RefreshCw className="borrow-spin" size={15}/> Borrowing…</> : isInitializing || checkingLoan ? 'Checking your loans…' : <><BookOpen size={15}/> Borrow Book</>}
              </button>}
            </>}
            {!user && !isInitializing && book.availableCopies > 0 && <Link className="btn dark borrow-book-action" href="/login">Sign in to borrow <ArrowRight size={15}/></Link>}
            {isAdmin && <><Link className="btn" href={`/admin/books?edit=${encodeURIComponent(book._id)}`}>Edit book <ArrowRight size={15}/></Link><Link className="book-detail-manage" href="/admin/books">Manage books</Link></>}
          </div>
        </div>
      </section>

      <section className="book-detail-lower">
        <article className="book-detail-panel book-copy-panel"><div><span className="eyebrow">COPY INFORMATION</span><h2>Availability at a glance</h2></div><div className="book-copy-grid"><div><span>Total copies</span><b>{book.totalCopies}</b></div><div><span>Available</span><b>{book.availableCopies}</b></div><div><span>Issued</span><b>{book.issuedCopies}</b></div></div></article>
        {isAdmin && <article className="book-detail-panel book-borrowers-panel"><div className="book-borrowers-heading"><div><span className="eyebrow">ADMIN VIEW</span><h2>Active borrowers</h2></div><span className="book-borrower-count">{borrowersLoading ? '…' : borrowers.length}</span></div>
          {borrowersLoading ? <div className="book-borrowers-state" role="status">Loading borrower details…</div> : borrowersError ? <div className="book-borrowers-state book-detail-error" role="alert">{borrowersError}</div> : borrowers.length ? <div className="book-borrower-list">{borrowers.map(borrower => <article className="book-borrower-row" key={borrower.issueId}><div className="book-borrower-person"><span className="book-borrower-avatar">{borrower.student.name.slice(0, 1).toUpperCase()}</span><div><b>{borrower.student.name}</b><small>{borrower.student.userId}</small></div></div><dl><div><dt>Semester</dt><dd>{borrower.student.semester || 'Not provided'}</dd></div><div><dt>Roll number</dt><dd>{borrower.student.rollNumber || 'Not provided'}</dd></div><div><dt>Department</dt><dd>{borrower.student.department || 'Not provided'}</dd></div><div><dt>Issued</dt><dd><CalendarDays size={13}/>{formatDate(borrower.issueDate)}</dd></div><div><dt>Due</dt><dd><CalendarDays size={13}/>{formatDate(borrower.dueDate)}</dd></div></dl></article>)}</div> : <div className="book-borrowers-state">There are no active borrowers for this title.</div>}
        </article>}
      </section>
    </>}
    <AnimatePresence>
      {confirmBorrow && book && isStudent && <motion.div className="borrow-confirm-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !borrowing) setConfirmBorrow(false); }}>
        <motion.section ref={dialogRef} className="borrow-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="borrow-confirm-title" aria-describedby="borrow-confirm-description" aria-busy={borrowing} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: 0.18 }}>
          <button className="borrow-confirm-close" type="button" aria-label="Close borrowing confirmation" disabled={borrowing} onClick={() => setConfirmBorrow(false)}><X size={17}/></button>
          <span className="borrow-confirm-icon"><BookOpen size={21}/></span>
          <span className="eyebrow">BORROWING CONFIRMATION</span>
          <h2 id="borrow-confirm-title">Borrow this book?</h2>
          <p id="borrow-confirm-description">{book.title} has {book.availableCopies} {book.availableCopies === 1 ? 'copy' : 'copies'} available. Confirm to add it to your issued books.</p>
          <div className="borrow-confirm-due"><CalendarDays size={16}/><span>The due date will be assigned at checkout: 14 days from the issue date.</span></div>
          <div className="borrow-confirm-actions"><button className="btn" type="button" disabled={borrowing} onClick={() => setConfirmBorrow(false)}>Cancel</button><button className="btn dark" type="button" ref={confirmButtonRef} disabled={borrowing} onClick={borrowBook}>{borrowing ? <><RefreshCw className="borrow-spin" size={15}/> Processing…</> : <>Confirm borrow <ArrowRight size={15}/></>}</button></div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </main>;
}
