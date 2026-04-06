'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  name: string;
  lastname: string;
  role: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      window.location.href = '/';
    } else {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid #e2e8f0', 
            borderTopColor: '#2563eb', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}/>
          <p style={{ color: '#64748b' }}>Cargando...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-10v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/clients', label: 'Clientes', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { href: '/dashboard/loans', label: 'Préstamos', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (user.role === 'admin') {
    navLinks.push(
      { href: '/dashboard/loan-types', label: 'Tipos Préstamo', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
      { href: '/dashboard/users', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="container header-content">
          <Link href="/dashboard" className="header-logo">
            <div className="header-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span>Stefanov</span>
          </Link>

          <button 
            className="btn btn-secondary" 
            style={{ display: 'none', padding: '0.5rem' }}
            onClick={() => setMenuOpen(!menuOpen)}
            id="mobile-menu-btn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>

          <nav className="header-nav" id="main-nav">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d={link.icon}/>
                </svg>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-user">
            <div className="header-user-info">
              <div className="header-user-name">{user.name} {user.lastname}</div>
              <div className="header-user-role">{user.role === 'admin' ? 'Administrador' : 'Operador'}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-danger" title="Cerrar sesión">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span style={{ display: 'none' }}>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {children}
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <p className="footer-text">© 2026 Microcreditos Stefanov. Todos los derechos reservados.</p>
          <p className="footer-text">Sistema de Gestión de Préstamos v1.0</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          #main-nav { display: none !important; }
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
