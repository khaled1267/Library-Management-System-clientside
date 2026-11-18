'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, LayoutGrid, List, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { CatalogSelect } from '@/components/catalog-select';
import type { CatalogOption } from '@/components/catalog-select';
import { useAuth } from '@/components/providers';
import api from '@/lib/api';

type BookRecord = {
  _id: string;
  title: string;
  author?: CatalogOption;
  category?: CatalogOption;
  isbn?: string;
  coverUrl?: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies?: number;
  availabilityStatus?: 'Available' | 'Busy' | 'Unavailable';
  publishedYear?: number;
  description?: string;
};
type ManagedRecord = CatalogOption & { email?: string; biography?: string; description?: string; createdAt?: string };
type BookPagination = { page: number; limit: number; total: number; totalPages: number };

const message = (error: any) => error?.response?.data?.message || 'Something went wrong. Please try again.';
function CatalogHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function useDialogKeyboard(close: () => void, disabled = false) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  const disabledRef = useRef(disabled);
  useEffect(() => { closeRef.current = close; disabledRef.current = disabled; }, [close, disabled]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fields = 'input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled)';
    const first = dialog.querySelector<HTMLElement>(fields) || dialog.querySelector<HTMLElement>('button:not([disabled])');
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disabledRef.current) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!items.length) { event.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || !dialog.contains(document.activeElement))) {
        event.preventDefault(); lastItem.focus();
      } else if (!event.shiftKey && (document.activeElement === lastItem || !dialog.contains(document.activeElement))) {
        event.preventDefault(); firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, []);
  return dialogRef;
}

function CatalogDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const dialogRef = useDialogKeyboard(close);
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><header><h2>{title}</h2><button type="button" aria-label="Close" onClick={close}><X size={19}/></button></header>{children}</section></div>;
}

type BorrowerRecord = {
  issueId: string;
  student: { name: string; userId: string; semester: string; rollNumber: string; department: string };
  issueDate: string;
  dueDate: string;
};

function AvailabilityDetails({ bookId, isAdmin }: { bookId: string; isAdmin: boolean }) {
  const [book, setBook] = useState<BookRecord | null>(null);
  const [borrowers, setBorrowers] = useState<BorrowerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [borrowerError, setBorrowerError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      setBorrowerError('');
      try {
        const response = await api.get(`/books/${bookId}/availability`);
        if (active) setBook(response.data.book);
        if (isAdmin) {
          try {
            const borrowerResponse = await api.get(`/books/${bookId}/borrowers`);
            if (active) setBorrowers(borrowerResponse.data.borrowers || []);
          } catch (requestError) {
            if (active) setBorrowerError(message(requestError));
          }
        } else if (active) setBorrowers([]);
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.status === 404 ? 'This title is no longer in the library catalog.' : message(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [bookId, isAdmin]);

  const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  const status = book?.availabilityStatus || 'Unavailable';
  return loading ? <div className="availability-loading" role="status" aria-live="polite"><span className="catalog-spin"><RefreshCw size={17}/></span>Loading availability…</div> : error ? <div className="catalog-page-state catalog-page-error" role="alert"><b>{error.includes('no longer') ? 'Unavailable' : 'Could not load availability'}</b><span>{error}</span></div> : !book ? null : <div className="availability-details">
    <div className="availability-book-heading">
      <div className="availability-cover">{book.coverUrl ? <img src={book.coverUrl} alt={`Cover of ${book.title}`}/> : <BookOpen size={26}/>}</div>
      <div><span className="category-tag">{book.category?.name || 'Uncategorized'}</span><h3>{book.title}</h3><p>{book.author?.name || 'Author unavailable'}</p></div>
      <span className={`availability-badge ${status.toLowerCase()}`}>{status}</span>
    </div>
    <dl className="availability-facts">
      <div><dt>ISBN</dt><dd>{book.isbn || 'Not listed'}</dd></div>
      <div><dt>Total copies</dt><dd>{book.totalCopies}</dd></div>
      <div><dt>Available</dt><dd>{book.availableCopies}</dd></div>
      <div><dt>Issued</dt><dd>{book.issuedCopies ?? 0}</dd></div>
    </dl>
    {isAdmin && <section className="availability-borrowers"><div className="availability-section-heading"><div><span className="eyebrow">ACTIVE LOANS</span><h4>Current borrowers</h4></div><span>{borrowers.length}</span></div>
      {borrowerError ? <p className="availability-message" role="alert">{borrowerError}</p> : borrowers.length ? <div className="availability-borrower-list">{borrowers.map(borrower => <article className="availability-borrower" key={borrower.issueId}><div className="availability-borrower-title"><b>{borrower.student.name}</b><span>{borrower.student.userId}</span></div><dl><div><dt>Semester</dt><dd>{borrower.student.semester || 'Not provided'}</dd></div><div><dt>Roll number</dt><dd>{borrower.student.rollNumber || 'Not provided'}</dd></div><div><dt>Department</dt><dd>{borrower.student.department || 'Not provided'}</dd></div><div><dt>Issued</dt><dd><CalendarDays size={13}/>{date(borrower.issueDate)}</dd></div><div><dt>Due</dt><dd><CalendarDays size={13}/>{date(borrower.dueDate)}</dd></div></dl></article>)}</div> : <p className="availability-message">There are no active borrowers for this title.</p>}
    </section>}
  </div>;
}

function ConfirmDialog({ title, detail, busy, close, confirm }: { title: string; detail: string; busy: boolean; close: () => void; confirm: () => void }) {
  const dialogRef = useDialogKeyboard(close, busy);
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget && !busy) close(); }}><section ref={dialogRef} className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title} aria-describedby="confirm-detail" tabIndex={-1}><header><h2>{title}</h2><button type="button" aria-label="Close" disabled={busy} onClick={close}><X size={19}/></button></header><div className="confirm-dialog-body"><p id="confirm-detail">{detail}</p><div className="confirm-dialog-actions"><button className="btn" type="button" disabled={busy} onClick={close}>Cancel</button><button className="btn confirm-danger" type="button" disabled={busy} onClick={confirm}>{busy ? 'Removing…' : 'Delete'}</button></div></div></section></div>;
}

export function BooksPage() {
  const { user, notify } = useAuth();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<BookPagination>({ page: 1, limit: 24, total: 0, totalPages: 0 });
  const [authors, setAuthors] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<BookRecord | null>(null);
  const [authorId, setAuthorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState('');
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsBook, setDetailsBook] = useState<BookRecord | null>(null);
  const [requestedEditId, setRequestedEditId] = useState('');
  const handledEditRequest = useRef(false);

  const loadReferences = useCallback(async () => {
    setReferencesLoading(true);
    setReferencesError('');
    try {
      const [authorResponse, categoryResponse] = await Promise.all([api.get('/authors'), api.get('/categories')]);
      if (!Array.isArray(authorResponse.data.authors) || !Array.isArray(categoryResponse.data.categories)) throw new Error('The author or category response had an unexpected format.');
      setAuthors(authorResponse.data.authors);
      setCategories(categoryResponse.data.categories);
    } catch (error) {
      setReferencesError(message(error));
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    setBooksError('');
    try {
      const response = await api.get('/books', { params: {
        search, page, limit: 24,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(authorFilter ? { author: authorFilter } : {}),
        ...(availabilityFilter ? { available: availabilityFilter === 'available' } : {}),
      } });
      const responsePagination: BookPagination = response.data.pagination || { page, limit: 24, total: response.data.books.length, totalPages: 1 };
      if (responsePagination.totalPages > 0 && page > responsePagination.totalPages) {
        setPage(responsePagination.totalPages);
        return;
      }
      setBooks(response.data.books);
      setPagination(responsePagination);
    } catch (error) {
      setBooksError(message(error));
    } finally {
      setBooksLoading(false);
    }
  }, [authorFilter, availabilityFilter, categoryFilter, page, search]);

  const visibleBooks = books;

  useEffect(() => { void loadBooks(); }, [loadBooks]);
  useEffect(() => {
    void loadReferences();
    const refreshReferences = () => { void loadReferences(); };
    window.addEventListener('library:catalog-updated', refreshReferences);
    return () => window.removeEventListener('library:catalog-updated', refreshReferences);
  }, [loadReferences]);

  const openAdd = () => {
    setEditing(null);
    setAuthorId('');
    setCategoryId('');
    setModal(true);
    void loadReferences();
  };
  const openEdit = (book: BookRecord) => {
    setEditing(book);
    setAuthorId(book.author?._id || '');
    setCategoryId(book.category?._id || '');
    setModal(true);
    void loadReferences();
  };

  useEffect(() => {
    setRequestedEditId(new URLSearchParams(window.location.search).get('edit') || '');
  }, []);

  useEffect(() => {
    if (!requestedEditId || user?.role !== 'admin' || handledEditRequest.current) return;
    handledEditRequest.current = true;
    const openRequestedBook = async () => {
      try {
        const response = await api.get(`/books/${encodeURIComponent(requestedEditId)}/availability`);
        if (!response.data.book) throw new Error('Book not found.');
        const requestedBook = response.data.book as BookRecord;
        setEditing(requestedBook);
        setAuthorId(requestedBook.author?._id || '');
        setCategoryId(requestedBook.category?._id || '');
        setModal(true);
        void loadReferences();
      } catch (error) {
        notify(message(error), 'error');
      } finally {
        window.history.replaceState(null, '', window.location.pathname);
        setRequestedEditId('');
      }
    };
    void openRequestedBook();
  }, [loadReferences, notify, requestedEditId, user?.role]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorId || !categoryId) {
      notify('Choose an author and category before saving the book.', 'error');
      return;
    }
    const form = new FormData(event.currentTarget);
    const data: Record<string, string | number> = Object.fromEntries(form.entries()) as Record<string, string>;
    for (const field of ['totalCopies', 'availableCopies', 'publishedYear']) if (data[field]) data[field] = Number(data[field]);
    setSaving(true);
    try {
      if (editing) await api.patch(`/books/${editing._id}`, data);
      else await api.post('/books', data);
      notify(editing ? 'Book updated.' : 'Book added to the collection.');
      setModal(false);
      await loadBooks();
    } catch (error) {
      notify(message(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (book: BookRecord) => {
    setDeleting(true);
    try {
      await api.delete(`/books/${book._id}`);
      notify('Book removed.');
      setDeleteTarget(null);
      await loadBooks();
    } catch (error) { notify(message(error), 'error'); }
    finally { setDeleting(false); }
  };

  return <div className="portal-content catalog-page">
    <CatalogHeading eyebrow="THE COLLECTION" title="Books" subtitle="Search and manage the titles held in your library." action={user?.role === 'admin' && <button className="btn dark" onClick={openAdd}><Plus size={16}/> Add a book</button>}/>
    <div className="catalog-toolbar">
      <div className="filter-row"><label className="input-search"><Search size={17}/><input aria-label="Search the collection" placeholder="Search title, author, or ISBN" value={search} onChange={event => { setPage(1); setSearch(event.target.value); }}/></label><select aria-label="Filter by category" value={categoryFilter} onChange={event => { setPage(1); setCategoryFilter(event.target.value); }}><option value="">All categories</option>{categories.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select aria-label="Filter by author" value={authorFilter} onChange={event => { setPage(1); setAuthorFilter(event.target.value); }}><option value="">All authors</option>{authors.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select aria-label="Filter by availability" value={availabilityFilter} onChange={event => { setPage(1); setAvailabilityFilter(event.target.value); }}><option value="">Any availability</option><option value="available">Available</option><option value="unavailable">Checked out</option></select></div>
      <div className="catalog-toolbar-meta"><span className="filter-count" aria-live="polite">{pagination.total} {pagination.total === 1 ? 'title' : 'titles'}</span><div className="catalog-view-toggle" role="group" aria-label="Book layout"><button type="button" aria-label="Card view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16}/></button><button type="button" aria-label="Table view" aria-pressed={view === 'table'} onClick={() => setView('table')}><List size={17}/></button></div></div>
    </div>
    {pagination.totalPages > 1 && <nav className="book-pagination" aria-label="Book catalog pages"><span>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span><div><button className="btn small" type="button" disabled={page <= 1 || booksLoading} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><span aria-current="page">Page {pagination.page} of {pagination.totalPages}</span><button className="btn small" type="button" disabled={page >= pagination.totalPages || booksLoading} onClick={() => setPage(value => Math.min(pagination.totalPages, value + 1))}>Next</button></div></nav>}{booksLoading ? <div className="catalog-page-state" aria-live="polite"><span className="catalog-spin"><RefreshCw size={18}/></span>Loading books from the library…</div> : booksError ? <div className="catalog-page-state catalog-page-error"><b>Books could not be loaded.</b><span>{booksError}</span><button className="btn small" onClick={() => void loadBooks()}>Try again</button></div> : visibleBooks.length ? view === 'grid' ? <div className="manage-book-grid">{visibleBooks.map(book => <article className="manage-book" key={book._id}><Link className="manage-book-hit-area" href={'/books/' + book._id} aria-label={'View details for ' + book.title}/><div className="manage-book-cover">{book.coverUrl ? <img src={book.coverUrl} alt={`Cover of ${book.title}`}/> : <div className="book-cover-placeholder"><BookOpen size={24}/><span>LIBRARY<br/>COLLECTION</span></div>}<span className={`status-${(book.availabilityStatus || 'Unavailable').toLowerCase()}`}>{book.availabilityStatus || 'Unavailable'}</span></div><div className="manage-book-body"><span className="category-tag">{book.category?.name || 'Uncategorized'}</span><h3>{book.title}</h3><p>{book.author?.name || 'Author unavailable'}</p><div className="book-extra"><span>{book.isbn || 'No ISBN'}</span><span>{book.availableCopies} available · {book.issuedCopies ?? 0} issued</span></div><button className="book-details-link" type="button" onClick={() => setDetailsBook(book)}>View availability details <ArrowRight size={14}/></button>{user?.role === 'admin' && <div className="row-actions"><button onClick={() => openEdit(book)}><Pencil size={14}/> Edit</button><button className="danger-text" onClick={() => setDeleteTarget(book)}><Trash2 size={14}/> Delete</button></div>}</div></article>)}</div> : <section className="panel catalog-inventory-table"><div className="table-wrap"><table><thead><tr><th>Title</th><th>Author</th><th>Category</th><th>ISBN</th><th>Copies</th><th>Availability</th><th>Details</th>{user?.role === 'admin' && <th>Actions</th>}</tr></thead><tbody>{visibleBooks.map(book => <tr key={book._id}><td><div className="inventory-title"><span>{book.coverUrl ? <img src={book.coverUrl} alt=""/> : <BookOpen size={17}/>}</span><Link className="inventory-book-link" href={'/books/' + book._id}>{book.title}</Link></div></td><td>{book.author?.name || 'Author unavailable'}</td><td>{book.category?.name || 'Uncategorized'}</td><td>{book.isbn || '—'}</td><td>{book.availableCopies} available / {book.issuedCopies ?? 0} issued</td><td><span className={`inventory-status ${(book.availabilityStatus || 'Unavailable').toLowerCase()}`}>{book.availabilityStatus || 'Unavailable'}</span></td><td><button className="book-details-link" type="button" onClick={() => setDetailsBook(book)}>Details</button></td>{user?.role === 'admin' && <td><div className="row-actions"><button onClick={() => openEdit(book)}><Pencil size={14}/> Edit</button><button className="danger-text" onClick={() => setDeleteTarget(book)}><Trash2 size={14}/> Delete</button></div></td>}</tr>)}</tbody></table></div></section> : <section className="panel"><div className="empty-state"><BookOpen size={23}/><b>{search ? 'Unavailable in this catalog' : 'No books found'}</b><span>{search ? `No titles matched “${search}”.` : 'Try a different search or clear your filters.'}</span>{(search || categoryFilter || authorFilter || availabilityFilter) && <button className="btn small" onClick={() => { setPage(1); setSearch(''); setCategoryFilter(''); setAuthorFilter(''); setAvailabilityFilter(''); }}>Clear filters</button>}</div></section>}
    {deleteTarget && <ConfirmDialog title="Remove this book?" detail={`“${deleteTarget.title}” will be removed from the collection.`} busy={deleting} close={() => setDeleteTarget(null)} confirm={() => void remove(deleteTarget)}/>}
    {detailsBook && <CatalogDialog title="Book availability" close={() => setDetailsBook(null)}><AvailabilityDetails bookId={detailsBook._id} isAdmin={user?.role === 'admin'}/></CatalogDialog>}
    {modal && <CatalogDialog title={editing ? 'Edit book' : 'Add a book'} close={() => setModal(false)}><form className="modal-form" onSubmit={submit}>
      <label>Title<input name="title" required defaultValue={editing?.title}/></label>
      <div className="form-two catalog-select-row">
        <div><CatalogSelect label="Author" kind="author" options={authors} value={authorId} loading={referencesLoading} error={referencesError} onChange={setAuthorId} onRetry={() => void loadReferences()}/><input type="hidden" name="author" value={authorId}/></div>
        <div><CatalogSelect label="Category" kind="category" options={categories} value={categoryId} loading={referencesLoading} error={referencesError} onChange={setCategoryId} onRetry={() => void loadReferences()}/><input type="hidden" name="category" value={categoryId}/></div>
      </div>
      <div className="form-two"><label>ISBN<input name="isbn" defaultValue={editing?.isbn}/></label><label>Published year<input name="publishedYear" type="number" min="0" defaultValue={editing?.publishedYear}/></label></div>
      <div className="form-two"><label>Total copies<input name="totalCopies" type="number" min="0" required defaultValue={editing?.totalCopies ?? 1}/></label><label>Available copies<input name="availableCopies" type="number" min="0" required defaultValue={editing?.availableCopies ?? editing?.totalCopies ?? 1}/></label></div>
      <label>Cover image URL<input name="coverUrl" defaultValue={editing?.coverUrl}/></label><label>Description<textarea name="description" defaultValue={editing?.description}/></label>
      <button className="btn dark" disabled={saving || referencesLoading || !authorId || !categoryId}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add book'} <ArrowRight size={15}/></button>
    </form></CatalogDialog>}
  </div>;
}

export function ManagePage({ type }: { type: 'categories' | 'authors' }) {
  const { notify } = useAuth();
  const [items, setItems] = useState<ManagedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ManagedRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const label = type === 'authors' ? 'Author' : 'Category';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/${type}`);
      if (!Array.isArray(response.data[type])) throw new Error(`The ${type} response had an unexpected format.`);
      setItems(response.data[type]);
    } catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (editing) await api.patch(`/${type}/${editing._id}`, data);
      else await api.post(`/${type}`, data);
      notify(`${label} saved.`);
      setModal(false);
      await load();
      window.dispatchEvent(new Event('library:catalog-updated'));
    } catch (reason) { notify(message(reason), 'error'); }
  };

  const remove = async (item: ManagedRecord) => {
    setDeleting(true);
    try {
      await api.delete(`/${type}/${item._id}`);
      notify(`${label} deleted.`);
      setDeleteTarget(null);
      await load();
      window.dispatchEvent(new Event('library:catalog-updated'));
    } catch (reason) { notify(message(reason), 'error'); }
    finally { setDeleting(false); }
  };

  return <div className="portal-content catalog-page">
    <CatalogHeading eyebrow="COLLECTION SETUP" title={type[0].toUpperCase() + type.slice(1)} subtitle={`Organize ${type} used in the library catalogue.`} action={<button className="btn dark" onClick={() => { setEditing(null); setModal(true); }}><Plus size={16}/> Add {label.toLowerCase()}</button>}/>
    <section className="panel">
      {loading ? <div className="catalog-page-state"><span className="catalog-spin"><RefreshCw size={18}/></span>Loading {type} from the library…</div> : error ? <div className="catalog-page-state catalog-page-error"><b>{label}s could not be loaded.</b><span>{error}</span><button className="btn small" onClick={() => void load()}>Try again</button></div> : items.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>{type === 'authors' ? 'Email' : 'Description'}</th><th>Added</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item._id}><td><b>{item.name}</b></td><td>{type === 'authors' ? item.email || '—' : item.description || '—'}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td><td><div className="row-actions"><button onClick={() => { setEditing(item); setModal(true); }}><Pencil size={14}/> Edit</button><button className="danger-text" onClick={() => setDeleteTarget(item)}><Trash2 size={14}/> Delete</button></div></td></tr>)}</tbody></table></div> : <div className="catalog-page-state catalog-empty-state"><span className="catalog-empty-icon"><BookOpen size={20}/></span><b>No {type} yet</b><span>Create the first {label.toLowerCase()} so books can reference it.</span><button className="btn dark small" onClick={() => { setEditing(null); setModal(true); }}><Plus size={14}/> Add {label.toLowerCase()}</button></div>}
    </section>
    {deleteTarget && <ConfirmDialog title={`Remove this ${label.toLowerCase()}?`} detail={`“${deleteTarget.name}” will be removed from the library.`} busy={deleting} close={() => setDeleteTarget(null)} confirm={() => void remove(deleteTarget)}/>}
    {modal && <CatalogDialog title={`${editing ? 'Edit' : 'Add'} ${label.toLowerCase()}`} close={() => setModal(false)}><form className="modal-form" onSubmit={submit}><label>Name<input required name="name" defaultValue={editing?.name}/></label>{type === 'authors' ? <><label>Email<input name="email" type="email" defaultValue={editing?.email}/></label><label>Biography<textarea name="biography" defaultValue={editing?.biography}/></label></> : <label>Description<textarea name="description" defaultValue={editing?.description}/></label>}<button className="btn dark">Save {label.toLowerCase()} <ArrowRight size={15}/></button></form></CatalogDialog>}
  </div>;
}
