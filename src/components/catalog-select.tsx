'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';

export type CatalogOption = { _id: string; name: string };

type CatalogSelectProps = {
  label: string;
  kind: 'author' | 'category';
  options: CatalogOption[];
  value: string;
  loading: boolean;
  error: string;
  onChange: (id: string) => void;
  onRetry: () => void;
};

export function CatalogSelect({ label, kind, options, value, loading, error, onChange, onRetry }: CatalogSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option._id === value);
  const plural = kind === 'author' ? 'authors' : 'categories';
  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return search ? options.filter(option => option.name.toLocaleLowerCase().includes(search)) : options;
  }, [options, query]);
  const managePath = kind === 'author' ? '/admin/authors' : '/admin/categories';

  useEffect(() => {
    const closeIfOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeIfOutside);
    return () => document.removeEventListener('mousedown', closeIfOutside);
  }, []);

  return <div className="catalog-select" ref={root}>
    <label className="catalog-select-label" htmlFor={`catalog-${kind}`}>{label}</label>
    <div className={`catalog-select-control ${open ? 'is-open' : ''}`}>
      <Search size={16}/>
      <input
        id={`catalog-${kind}`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`catalog-${kind}-options`}
        aria-label={label}
        placeholder={`Search ${plural}â€¦`}
        value={open ? query : selected?.name || ''}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={event => { setQuery(event.target.value); setOpen(true); if (value) onChange(''); }}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && open && matches[0]) {
            event.preventDefault();
            onChange(matches[0]._id);
            setQuery('');
            setOpen(false);
          }
        }}
        autoComplete="off"
      />
      {loading ? <LoaderCircle className="catalog-spin" size={16}/> : <ChevronDown size={16}/>}
    </div>
    {open && <div className="catalog-select-menu" id={`catalog-${kind}-options`} role="listbox" aria-label={`${label} options`}>
      {loading ? <div className="catalog-select-message"><LoaderCircle className="catalog-spin" size={15}/>Loading {plural} from the libraryâ€¦</div> : error ? <div className="catalog-select-message catalog-select-error"><span>{error}</span><button type="button" onClick={onRetry}>Try again</button></div> : options.length === 0 ? <div className="catalog-select-message catalog-select-empty"><b>No {plural} have been added yet.</b><span>Add one before creating this book.</span><Link href={managePath}>Go to {plural} management <span aria-hidden="true">â†’</span></Link></div> : matches.length === 0 ? <div className="catalog-select-message">No matching {plural}. Try a different search.</div> : matches.map(option => <button
        type="button"
        role="option"
        aria-selected={option._id === value}
        key={option._id}
        className="catalog-select-option"
        onClick={() => { onChange(option._id); setQuery(''); setOpen(false); }}
      ><span>{option.name}</span>{option._id === value && <Check size={15}/>}</button>)}
    </div>}
  </div>;
}
