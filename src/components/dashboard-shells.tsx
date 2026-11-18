'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, BookMarked, BookCopy, GraduationCap, Search,
  LayoutDashboard, Library, LogOut, Menu, Settings, UserRound, Users, X,
  RotateCcw, ChevronDown, Moon, Sun, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/providers';

type DashboardRole = 'admin' | 'student';
type NavigationItem = { label: string; href: string; icon: LucideIcon };

const adminNavigation: NavigationItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Books', href: '/admin/books', icon: BookOpen },
  { label: 'Google Books', href: '/admin/book-search', icon: Search },
  { label: 'Categories', href: '/admin/categories', icon: BookCopy },
  { label: 'Authors', href: '/admin/authors', icon: UserRound },
  { label: 'Students', href: '/admin/students', icon: GraduationCap },
  { label: 'Issues', href: '/admin/issues', icon: BookMarked },
  { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const studentNavigation: NavigationItem[] = [
  { label: 'My overview', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Browse books', href: '/student/books', icon: BookOpen },
  { label: 'My books', href: '/student/my-books', icon: BookMarked },
  { label: 'Profile', href: '/student/profile', icon: UserRound },
  { label: 'Settings', href: '/student/settings', icon: Settings },
];

function DashboardShell({ role, children }: { role: DashboardRole; children: ReactNode }) {
  const { user, isInitializing, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [topProfileOpen, setTopProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const expectedRole = role;
  const homeHref = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
  const profileHref = role === 'admin' ? '/admin/settings' : '/student/profile';
  const navigation = role === 'admin' ? adminNavigation : studentNavigation;
  const title = navigation.find(item => pathname === item.href)?.label || (role === 'admin' ? 'Administration' : 'Student portal');

  useEffect(() => {
    setCollapsed(localStorage.getItem('library-sidebar-collapsed') === 'true');
    const savedTheme = localStorage.getItem('library-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('library-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('library-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) return;
    sidebarRef.current?.querySelector<HTMLAnchorElement>('.dashboard-nav-link')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setMenuOpen(false); };
    desktop.addEventListener('change', closeDrawerOnDesktop);
    return () => desktop.removeEventListener('change', closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setTopProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isInitializing) return;
    if (!user) router.replace('/login');
    else if (user.role !== expectedRole) router.replace(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  }, [expectedRole, isInitializing, router, user]);

  if (isInitializing || !user || user.role !== expectedRole) {
    return <main className={`dashboard-loading ${role}`}><span className="dashboard-spinner"/>Verifying your library session…</main>;
  }

  const doSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return <div className={`dashboard-layout ${role} ${collapsed ? 'sidebar-collapsed' : ''}`} data-theme={theme}>
    {menuOpen && <button className="dashboard-scrim" type="button" aria-label="Close navigation" onClick={() => { setMenuOpen(false); mobileToggleRef.current?.focus(); }}/>}
    <aside className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`} id="app-navigation" ref={sidebarRef}>
      <Link className="dashboard-brand" href={homeHref} onClick={() => setMenuOpen(false)}>
        <span className="dashboard-brand-icon"><Library size={19}/></span>
        <span><b>Barguna Politechnic Institute</b><small>{role === 'admin' ? 'LIBRARY ADMIN' : 'STUDENT LIBRARY'}</small></span>
      </Link>
      <div className="dashboard-nav-label">{role === 'admin' ? 'MANAGEMENT' : 'YOUR LIBRARY'}</div>
      <nav aria-label={`${role} navigation`} className="dashboard-nav">
        {navigation.map(({ label, href, icon: Icon }) => <Link
          key={href}
          href={href}
          onClick={() => setMenuOpen(false)}
          aria-label={collapsed ? label : undefined}
          title={collapsed ? label : undefined}
          aria-current={pathname === href ? 'page' : undefined}
          className={`dashboard-nav-link ${pathname === href ? 'active' : ''}`}
        ><Icon size={18}/><span>{label}</span>{label === 'Students' && role === 'admin' && <span className="nav-link-dot"/>}</Link>)}
      </nav>
      <div className="dashboard-sidebar-bottom">
        <div className="dashboard-sidebar-note">
          {role === 'admin' ? <><Users size={18}/><span><b>Library operations</b><small>Manage your campus collection.</small></span></> : <><BookOpen size={18}/><span><b>Keep discovering</b><small>Your next good read is waiting.</small></span></>}
        </div>
        <div className="dashboard-sidebar-user">
          <span className="dashboard-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="dashboard-user-copy"><b>{user.name}</b><small>{role === 'admin' ? 'Administrator' : user.userId || 'Student'}</small></span>
          <button aria-label={profileOpen ? 'Close account menu' : 'Open account menu'} aria-expanded={profileOpen} aria-controls="sidebar-account-menu" className="dashboard-user-menu-button" onClick={() => setProfileOpen(value => !value)}><ChevronDown size={16}/></button>
          {profileOpen && <div className="dashboard-profile-menu" id="sidebar-account-menu">
            <Link href={profileHref} onClick={() => setProfileOpen(false)}><UserRound size={15}/>Account</Link>
            <button onClick={doSignOut}><LogOut size={15}/>Sign out</button>
          </div>}
        </div>
        <button className="dashboard-signout" onClick={doSignOut}><LogOut size={16}/>Sign out</button>
      </div>
    </aside>
    <div className="dashboard-main">
      <header className="dashboard-topbar">
        <button ref={mobileToggleRef} className="dashboard-mobile-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="app-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
        <button className="dashboard-collapse-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
        <div className="dashboard-breadcrumb"><span>{role === 'admin' ? 'ADMINISTRATION' : 'STUDENT SPACE'}</span><ArrowRight size={13}/><b>{title}</b></div>
        <div className="dashboard-topbar-right">
          <button className="dashboard-theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button>
          <span className="dashboard-role-pill">{role === 'admin' ? 'Admin workspace' : 'Student account'}</span>
          <button className="dashboard-top-user" aria-expanded={topProfileOpen} aria-controls="top-account-menu" onClick={() => setTopProfileOpen(value => !value)}><span className="dashboard-avatar small">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name}</span><ChevronDown size={15}/></button>
          {topProfileOpen && <div className="dashboard-top-menu" id="top-account-menu">
            <Link href={profileHref} onClick={() => setTopProfileOpen(false)}><UserRound size={15}/>Account settings</Link>
            <button onClick={doSignOut}><LogOut size={15}/>Sign out</button>
          </div>}
        </div>
      </header>
      <main className="dashboard-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pathname} className="dashboard-route-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .18, ease: 'easeOut' }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  </div>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return <DashboardShell role="admin">{children}</DashboardShell>;
}

export function StudentShell({ children }: { children: ReactNode }) {
  return <DashboardShell role="student">{children}</DashboardShell>;
}

export function LegacyAppRedirect() {
  const { user, isInitializing } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace('/login'); return; }
    const admin = user.role === 'admin';
    const redirects: Record<string, string> = {
      '/app': admin ? '/admin/dashboard' : '/student/dashboard',
      '/app/books': admin ? '/admin/books' : '/student/books',
      '/app/categories': admin ? '/admin/categories' : '/student/dashboard',
      '/app/authors': admin ? '/admin/authors' : '/student/dashboard',
      '/app/students': admin ? '/admin/students' : '/student/dashboard',
      '/app/issues': admin ? '/admin/issues' : '/student/my-books',
      '/app/returns': admin ? '/admin/returns' : '/student/dashboard',
      '/app/profile': admin ? '/admin/settings' : '/student/profile',
    };
    router.replace(redirects[pathname] || (admin ? '/admin/dashboard' : '/student/dashboard'));
  }, [isInitializing, pathname, router, user]);

  return <main className="dashboard-loading"><span className="dashboard-spinner"/>Opening your dashboard…</main>;
}
