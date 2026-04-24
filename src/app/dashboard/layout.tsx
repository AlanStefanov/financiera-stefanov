'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SnackbarProvider } from '@/components/Snackbar';

interface User {
  id: number;
  username: string;
  name: string;
  lastname: string;
  role: string;
}

interface Settings {
  company_name: string;
  company_logo: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ company_name: 'Microcréditos Stefanov', company_logo: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      window.location.href = '/';
    } else {
      setUser(JSON.parse(storedUser));
      fetchSettings();
      setLoading(false);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;
      
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${JSON.parse(stored).token}` }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('companySettings', JSON.stringify(data));
        setSettings({
          company_name: data.company_name || 'Microcréditos Stefanov',
          company_logo: data.company_logo || '',
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

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

  const adminLinks = [];

  return (
    <SnackbarProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header">
        <div className="container header-content">
          <Link href="/dashboard" className="header-logo">
            <img 
              src={settings.company_logo || '/logo.png'} 
              alt={settings.company_name}
              style={{ 
                height: '56px', 
                borderRadius: '6px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
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
            {[...navLinks, ...adminLinks].map(link => (
              <Link key={link.href} href={link.href}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d={link.icon}/>
                </svg>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-user">
            {user.role === 'admin' && (
              <Link href="/dashboard/settings" className="btn btn-secondary" title="Configuración" style={{ padding: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001.51-1V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </Link>
            )}
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

      {menuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            zIndex: 999,
            overflowY: 'auto',
            padding: '1rem'
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...navLinks, ...adminLinks].map(link => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  color: '#1e293b',
                  backgroundColor: '#f1f5f9'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d={link.icon}/>
                </svg>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {children}
      </main>

        <footer className="footer">
        <div className="container footer-content">
          <p className="footer-text">© 2026 {settings.company_name}. Todos los derechos reservados.</p>
          <p className="footer-text">Sistema de Gestión de Préstamos v1.7.0</p>
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
    </SnackbarProvider>
  );
}
