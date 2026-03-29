'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('devmri-theme') as Theme | null;
    const initial = saved || 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('light-theme', initial === 'light');
    document.documentElement.classList.toggle('dark-theme', initial === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('devmri-theme', next);
      document.documentElement.classList.toggle('light-theme', next === 'light');
      document.documentElement.classList.toggle('dark-theme', next === 'dark');
      return next;
    });
  }, []);

  // Prevent flash — render nothing until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ─── Theme Toggle Button ─── */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        background: 'none',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '6px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
        color: 'var(--text-primary)',
        transition: 'all 0.3s ease',
        width: 36,
        height: 36,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--scan-cyan)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
