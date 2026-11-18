'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, LoaderCircle, Search, X } from 'lucide-react';
import { CatalogSelect } from '@/components/catalog-select';
import type { CatalogOption } from '@/components/catalog-select';
import { useAuth } from '@/components/providers';
import api from '@/lib/api';

type GoogleBook = {
  id: string;
  title: string;
  authors: string[];
  description: string;
  isbn: string;
  publishedDate: string;
  coverUrl: string;
};

const message = (error: any) => error?.response?.data?.message || 'Something went wrong. Please try again.';

export function GoogleBooksSearchPage() {
  const { notify } = useAuth();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GoogleBook | null>(null);
  const [authors, setAuthors] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [authorId, setAuthorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReferences = useCallback(async () => {
    setReferencesLoading(true);
    setReferencesError('');
    try {
      const [authorResponse, categoryResponse] = await Promise.all([api.get('/authors'), api.get('/categories')]);
      setAuthors(authorResponse.data.authors);
      setCategories(categoryResponse.data.categories);
    } catch (reason) {
      setReferencesError(message(reason));
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const response = await api.get('/books/google-search', { params: { query: query.trim() } });
      setBooks(response.data.books);
    } catch (reason) {
      setBooks([]);
      setError(message(reason));
    } finally {
      setLoading(false);
    }
  };

  const openImport = async (book: GoogleBook) => {
    setSelected(book);
    setAuthorId('');
    setCategoryId('');
    await loadReferences();
  };

  const importBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !authorId || !categoryId) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const data = {
      ...values,
      author: authorId,
      category: categoryId,
      totalCopies: Number(values.totalCopies),
      availableCopies: Number(values.availableCopies),
      publishedYear: Number(values.publishedDate.match(/\d{4}/)?.[0]) || undefined,
    };
    setSaving(true);
    try {
      await api.post('/books', data);
      notify('Book imported into the collection.');
      setSelected(null);
      window.dispatchEvent(new Event('library:catalog-updated'));
    } catch (reason) {
      notify(message(reason), 'error');
    } finally {
      setSaving(false);
    }
  };

  return <div className="portal-content catalog-page ">
    <div className="page-head"><div><div className="eyebrow">EXPAND THE COLLECTION</div><h1>Google Books Search</h1><p>Find a title or ISBN, review the details, then import it into your library.</p></div></div>
    <form className="filter-row" onSubmit={search}>
      <label className="input-search"><Search size={17}/><input aria-label="Search Google Books by title or ISBN" placeholder="Search by title or ISBN…" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <button className="btn dark" type="submit" disabled={loading || !query.trim()}>{loading ? <LoaderCircle className="catalog-spin" size={16}/> : <Search size={16}/>} Search</button>
    </form>
    {loading ? <div className="catalog-page-state"><LoaderCircle className="catalog-spin" size={19}/>Searching Google Books…</div>
      : error ? <div className="catalog-page-state catalog-page-error"><b>Search could not be completed.</b><span>{error}</span><button className="btn small" onClick={() => { const form = document.querySelector<HTMLFormElement>('.filter-row'); form?.requestSubmit(); }}>Try again</button></div>
      : searched && books.length === 0 ? <section className="panel"><div className="empty-state"><BookOpen size={23}/><span>No books matched. Try another title or ISBN.</span></div></section>
      : books.length > 0 && <><p className="filter-count" style={{ margin: '0 0 12px' }}>{books.length} results from Google Books</p><div className="manage-book-grid">{books.map(book => <article className="manage-book" key={book.id}>
        <div className="manage-book-cover">{book.coverUrl ? <img src={book.coverUrl} alt={`Cover of ${book.title}`}/> : <div className="empty-state"><BookOpen size={23}/></div>}</div>
        <div className="manage-book-body"><h3>{book.title}</h3><p>{book.authors.join(', ') || 'Author not listed'}</p><div className="book-extra"><span>{book.isbn || 'No ISBN'}</span><span>{book.publishedDate || 'Publication date unavailable'}</span></div><button className="btn dark small" style={{ marginTop: 12 }} onClick={() => void openImport(book)}>Import book <ArrowRight size={14}/></button></div>
      </article>)}</div></>}
    {!searched && !loading && <section className="panel"><div className="empty-state"><Search size={23}/><span>Search Google Books by a book title or ISBN.</span></div></section>}

    {selected && <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setSelected(null); }}><section className="modal" role="dialog" aria-modal="true" aria-label="Review and import book">
      <header><h2>Review before importing</h2><button type="button" aria-label="Close" onClick={() => setSelected(null)} disabled={saving}><X size={19}/></button></header>
      <form className="modal-form" onSubmit={importBook}>
        <label>Title<input name="title" required defaultValue={selected.title}/></label>
        <div className="form-two catalog-select-row">
          <div><CatalogSelect label="Author" kind="author" options={authors} value={authorId} loading={referencesLoading} error={referencesError} onChange={setAuthorId} onRetry={() => void loadReferences()}/><input type="hidden" name="author" value={authorId}/></div>
          <div><CatalogSelect label="Category" kind="category" options={categories} value={categoryId} loading={referencesLoading} error={referencesError} onChange={setCategoryId} onRetry={() => void loadReferences()}/><input type="hidden" name="category" value={categoryId}/></div>
        </div>
        <div className="form-two"><label>ISBN<input name="isbn" defaultValue={selected.isbn}/></label><label>Published date<input name="publishedDate" defaultValue={selected.publishedDate}/></label></div>
        <div className="form-two"><label>Total copies<input name="totalCopies" type="number" min="0" required defaultValue="1"/></label><label>Available copies<input name="availableCopies" type="number" min="0" required defaultValue="1"/></label></div>
        <label>Cover image URL<input name="coverUrl" defaultValue={selected.coverUrl}/></label>
        <label>Description<textarea name="description" defaultValue={selected.description}/></label>
        {referencesError && <div className="form-error" role="alert">{referencesError}</div>}
        <button className="btn dark" disabled={saving || referencesLoading || !authorId || !categoryId}>{saving ? 'Importing…' : 'Import book'} <ArrowRight size={15}/></button>
      </form>
    </section></div>}
  </div>;
}
