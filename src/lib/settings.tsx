'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CompanySettings {
  company_name: string;
  company_phone: string;
  company_address: string;
  company_website: string;
  credit_limit_default: string;
}

const defaultSettings: CompanySettings = {
  company_name: 'Microcréditos Stefanov',
  company_phone: '+54 9 1127395566',
  company_address: 'Gonnet / La Plata, Buenos Aires',
  company_website: 'https://financiera-stefanov.vercel.app',
  credit_limit_default: '500000',
};

const SettingsContext = createContext<CompanySettings>(defaultSettings);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${JSON.parse(stored).token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        localStorage.setItem('companySettings', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  });
}