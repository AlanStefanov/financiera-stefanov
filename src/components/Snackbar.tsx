'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarContextType {
  showSnackbar: (message: string, type?: SnackbarType) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<{ message: string; type: SnackbarType } | null>(null);

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'success') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 4000);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {snackbar && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 500,
            fontSize: '14px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: snackbar.type === 'success' ? '#10b981' : snackbar.type === 'error' ? '#ef4444' : '#3b82f6',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {snackbar.message}
          <style jsx>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
}