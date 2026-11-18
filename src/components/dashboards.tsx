'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookMarked, BookOpen, CalendarDays, Clock3, GraduationCap, Library, RotateCcw, Settings, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/components/providers';
import api from '@/lib/api';

type BookRecord = { _id: string; title: string; author?: { name?: string }; category?: { name?: string }; coverUrl?: string; availableCopies?: number };
type IssueRecord = { _id: string; issueDate: string; dueDate: string; status: 'issued' | 'returned'; returnedAt?: string; book?: BookRecord; student?: { name?: string; userId?: string } };
type StudentRecord = { _id: string; name: string; userId?: string; department?: string; createdAt?: string };
type AdminDashboardData = {
  stats: { bookTitles: number; students: number; issued: number; availableBooks: number };
  recentIssues: IssueRecord[];
  recentStudents: StudentRecord[];
  byCategory: { _id: string; name?: string; copies: number; available: number }[];
};
type StudentDashboardData = {
  stats: { available: number; availableBooks: number; issued: number; overdue: number; returned: number };
  recentIssues: IssueRecord[];
  recommendedBooks: BookRecord[];
};

const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S';

function StatCard({ label, value, note, icon: Icon, tone, index = 0 }: { label: string; value: number | string; note: string; icon: typeof BookOpen; tone: string; index?: number }) {
  return <motion.article className={`dash-stat ${tone}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} whileTap={{ scale: .99 }} transition={{ duration: .22, delay: Math.min(index * .045, .14) }}><div className="dash-stat-top"><span>{label}</span><i><Icon size={19}/></i></div><strong>{value.toLocaleString()}</strong><small>{note}</small></motion.article>;
}

function LoadingPanel({ label }: { label: string }) {
  return <div className="dash-loading"><span className="dashboard-spinner"/>{label}</div>;
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <div className="dash-empty"><span><Library size={19}/></span><b>{title}</b><small>{detail}</small></div>;
}

export function AdminDashboardPage() {
  const { user, notify } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [recentBooks, setRecentBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get('/dashboard'), api.get('/books')]).then(([dashboardResult, booksResult]) => {
      if (!active) return;
      if (dashboardResult.status === 'fulfilled') setData(dashboardResult.value.data);
      else {
        setFailed(true);
        notify('The dashboard data could not be loaded.', 'error');
      }
      if (booksResult.status === 'fulfilled') setRecentBooks((booksResult.value.data.books || []).slice(0, 4));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notify]);

  return <div className="dash-page admin-dashboard-page">
    <section className="dash-welcome admin-welcome">
      <div><span className="dash-eyebrow">LIBRARY OVERVIEW</span><h1>Good day, {user?.name.split(' ')[0]}.</h1><p>Here is the latest activity across your college library.</p></div>
      <div className="welcome-mark"><Library size={30}/><span>COLLECTION<br/>OPERATIONS</span></div>
    </section>
    {loading ? <LoadingPanel label="Loading library activity…"/> : failed || !data ? <EmptyPanel title="Dashboard unavailable" detail="Check the API connection and reload this page."/> : <>
      <section className="dash-stat-grid" aria-label="Library totals">
        <StatCard label="Book titles" value={data.stats.bookTitles} note="Titles in the collection" icon={BookOpen} tone="blue" index={0}/>
        <StatCard label="Total Students" value={data.stats.students} note="Registered library members" icon={GraduationCap} tone="violet" index={1}/>
        <StatCard label="On loan" value={data.stats.issued} note="Active book issues" icon={BookMarked} tone="amber" index={2}/>
        <StatCard label="Available copies" value={data.stats.availableBooks} note="Ready to borrow" icon={Library} tone="green" index={3}/>
      </section>
      <section className="dash-admin-grid">
        <article className="dash-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">CIRCULATION</span><h2>Recent issue activity</h2></div><Link href="/admin/issues">All issues <ArrowRight size={15}/></Link></header>
          {data.recentIssues.length ? <div className="dash-table-scroll"><table className="dash-table"><thead><tr><th>Book</th><th>Student</th><th>Issued</th><th>Due date</th><th>Status</th></tr></thead><tbody>{data.recentIssues.map(issue => {
            const overdue = issue.status === 'issued' && new Date(issue.dueDate).getTime() < Date.now();
            return <tr key={issue._id}><td><div className="table-book"><span><BookOpen size={16}/></span><b>{issue.book?.title || 'Book unavailable'}</b></div></td><td><b>{issue.student?.name || 'Student'}</b><small>{issue.student?.userId || ''}</small></td><td>{shortDate(issue.issueDate)}</td><td>{shortDate(issue.dueDate)}</td><td><span className={`dash-status ${overdue ? 'overdue' : issue.status}`}>{overdue ? 'Overdue' : issue.status === 'issued' ? 'On loan' : 'Returned'}</span></td></tr>;
          })}</tbody></table></div> : <EmptyPanel title="No issue activity yet" detail="New loans will appear here."/>}
        </article>
        <article className="dash-panel recent-students-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">COMMUNITY</span><h2>Recent registrations</h2></div><Link href="/admin/students">View students <ArrowRight size={15}/></Link></header>
          {data.recentStudents.length ? <div className="dash-student-list">{data.recentStudents.map(student => <div className="dash-student-row" key={student._id}><span className="dash-person-avatar">{initials(student.name)}</span><div><b>{student.name}</b><small>{student.userId || student.department || 'Student member'}</small></div><time>{shortDate(student.createdAt)}</time></div>)}</div> : <EmptyPanel title="No student registrations yet" detail="New members will appear here."/>}
        </article>
      </section>
      <section className="dash-admin-lower-grid">
        <article className="dash-panel category-analytics-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">COLLECTION MIX</span><h2>Books by category</h2></div><Link href="/admin/categories">Manage categories <ArrowRight size={15}/></Link></header>
          {data.byCategory?.length ? <div className="category-bars">{data.byCategory.slice().sort((a, b) => b.copies - a.copies).slice(0, 6).map(category => {
            const maxCopies = Math.max(...data.byCategory.map(item => item.copies), 1);
            return <div className="category-bar-row" key={category._id || category.name}><div><span>{category.name || 'Uncategorized'}</span><b>{category.copies}</b></div><span className="category-bar-track"><i style={{ width: `${Math.max(6, category.copies / maxCopies * 100)}%` }}/></span><small>{category.available} available</small></div>;
          })}</div> : <EmptyPanel title="No category data yet" detail="Add categories to see the collection breakdown."/>}
        </article>
        <article className="dash-panel recent-books-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">NEW TO THE LIBRARY</span><h2>Recently added</h2></div><Link href="/admin/books">View collection <ArrowRight size={15}/></Link></header>
          {recentBooks.length ? <div className="recent-book-list">{recentBooks.map(book => <Link className="recent-book-row" href="/admin/books" key={book._id}><span className="recent-book-cover">{book.coverUrl ? <img src={book.coverUrl} alt=""/> : <BookOpen size={17}/>}</span><span><b>{book.title}</b><small>{book.author?.name || 'Author not listed'}</small></span><i>{book.availableCopies ?? 0} available</i></Link>)}</div> : <EmptyPanel title="No books to show" detail="Recently added titles will appear here."/>}
        </article>
      </section>
      <section className="dash-shortcuts"><div><span className="dash-eyebrow">QUICK ACTIONS</span><b>Keep the library moving</b></div><Link href="/admin/books"><BookOpen size={17}/>Manage books<ArrowRight size={14}/></Link><Link href="/admin/issues"><BookMarked size={17}/>Issue a book<ArrowRight size={14}/></Link><Link href="/admin/students"><Users size={17}/>Find a student<ArrowRight size={14}/></Link></section>
    </>}
  </div>;
}

export function StudentDashboardPage() {
  const { user, notify } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get('/dashboard').then(response => setData(response.data)).catch(() => {
      setFailed(true);
      notify('Your library activity could not be loaded.', 'error');
    }).finally(() => setLoading(false));
  }, [notify]);

  return <div className="dash-page student-dashboard-page">
    <section className="dash-welcome student-welcome">
      <div><span className="dash-eyebrow">YOUR CAMPUS LIBRARY</span><h1>Welcome back, {user?.name.split(' ')[0]}.</h1><p>Your next great read is closer than you think.</p><Link className="dash-primary-link" href="/student/books">Explore the collection <ArrowRight size={16}/></Link></div>
      <div className="student-id-card"><span>LIBRARY CARD</span><GraduationCap size={23}/><b>{user?.userId || 'STUDENT'}</b><small>{user?.department || 'Northstar College'}</small></div>
    </section>
    {loading ? <LoadingPanel label="Loading your reading activity…"/> : failed || !data ? <EmptyPanel title="Your dashboard is unavailable" detail="Check the API connection and reload this page."/> : <>
      <section className="dash-stat-grid student-stat-grid" aria-label="Your library activity">
        <StatCard label="Available Books" value={data.stats.availableBooks} note="Copies ready to explore" icon={BookOpen} tone="green" index={0}/>
        <StatCard label="My Issued Books" value={data.stats.issued} note="Currently on your account" icon={BookMarked} tone="blue" index={1}/>
        <StatCard label="Overdue Books" value={data.stats.overdue} note="Please return these soon" icon={Clock3} tone="rose" index={2}/>
        <StatCard label="Returned Books" value={data.stats.returned} note="Completed loans" icon={RotateCcw} tone="violet" index={3}/>
      </section>
      <section className="dash-student-grid">
        <article className="dash-panel borrowed-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">YOUR READING HISTORY</span><h2>Recently borrowed</h2></div><Link href="/student/my-books">My books <ArrowRight size={15}/></Link></header>
          {data.recentIssues.length ? <div className="borrowed-list">{data.recentIssues.map(issue => {
            const overdue = issue.status === 'issued' && new Date(issue.dueDate).getTime() < Date.now();
            return <div className="borrowed-row" key={issue._id}><div className="borrowed-cover">{issue.book?.coverUrl ? <img src={issue.book.coverUrl} alt=""/> : <BookOpen size={19}/>}</div><div className="borrowed-info"><b>{issue.book?.title || 'Book unavailable'}</b><small>{issue.book?.author?.name || 'Library collection'}</small><span><CalendarDays size={13}/> Borrowed {shortDate(issue.issueDate)}</span></div><div className="borrowed-state"><span className={`dash-status ${overdue ? 'overdue' : issue.status}`}>{overdue ? 'Overdue' : issue.status === 'issued' ? 'On loan' : 'Returned'}</span>{issue.status === 'issued' && <small>{overdue ? 'Was due' : 'Due'} {shortDate(issue.dueDate)}</small>}</div></div>;
          })}</div> : <EmptyPanel title="No borrowed books yet" detail="Books you borrow will show up here."/>}
        </article>
        <article className="dash-panel recommendation-panel">
          <header className="dash-panel-heading"><div><span className="dash-eyebrow">PICKED FROM THE SHELVES</span><h2>Recommended books</h2></div><Link href="/student/books">Browse all <ArrowRight size={15}/></Link></header>
          {data.recommendedBooks.length ? <div className="recommendation-list">{data.recommendedBooks.map(book => <Link className="recommendation-row" href="/student/books" key={book._id}><span className="recommendation-cover">{book.coverUrl ? <img src={book.coverUrl} alt=""/> : <BookOpen size={20}/>}</span><span className="recommendation-copy"><b>{book.title}</b><small>{book.author?.name || 'Unknown author'}</small><i>{book.category?.name || 'Library pick'} · {book.availableCopies} available</i></span><ArrowRight size={16}/></Link>)}</div> : <EmptyPanel title="No recommendations yet" detail="New available books will appear here."/>}
        </article>
      </section>
      <section className="dash-student-note"><span><UserPlus size={20}/></span><div><b>Your library account is ready</b><small>Update your contact details or password from your profile.</small></div><Link href="/student/profile">Manage profile <ArrowRight size={15}/></Link></section>
    </>}
  </div>;
}

export function AccountSettingsPage() {
  const { user } = useAuth();

  return <div className="dash-page account-settings-page">
    <section className="dash-welcome student-welcome">
      <div><span className="dash-eyebrow">ACCOUNT PREFERENCES</span><h1>Your settings</h1><p>Review your library account and manage your personal details.</p></div>
      <div className="student-id-card"><span>ACCOUNT TYPE</span><ShieldCheck size={23}/><b>Student</b><small>Verified library member</small></div>
    </section>
    <section className="dash-settings-card">
      <span className="dash-settings-icon"><Settings size={21}/></span>
      <div><span className="dash-eyebrow">PROFILE & SECURITY</span><h2>Personal details and password</h2><p>Update your contact information, department, student number, or password.</p></div>
      <Link href="/student/profile">Manage profile <ArrowRight size={16}/></Link>
    </section>
    <section className="dash-settings-card">
      <span className="dash-settings-icon"><BookMarked size={21}/></span>
      <div><span className="dash-eyebrow">BORROWING</span><h2>Your loans and returns</h2><p>Review active loans, due dates, and completed returns.</p></div>
      <Link href="/student/my-books">View my books <ArrowRight size={16}/></Link>
    </section>
    <section className="dash-account-summary">
      <div className="dash-person-avatar">{initials(user?.name)}</div><div><b>{user?.name}</b><small>{user?.email}</small></div><span>{user?.userId || 'Student account'}</span>
    </section>
  </div>;
}
