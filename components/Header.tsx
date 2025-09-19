
import React, { useEffect, useState } from 'react';
import { CloudIcon, MoonIcon, SunIcon } from './icons';

interface HeaderProps {
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-light');
    if (theme === 'light') {
      body.classList.add('theme-light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <header className="panel-animated shadow-lg ring-1 ring-white/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onLogoClick}
        >
          <CloudIcon className="w-8 h-8 text-accent group-hover:animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight text-text-main group-hover:text-accent transition-colors">
            Live Q&A 
          </h1>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <>
              <SunIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <MoonIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
