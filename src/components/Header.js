'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Globe, LogOut, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { translations, getInitialLanguage } from '@/lib/translations';

export default function Header() {
  const [lang, setLang] = useState('en');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    setLang(getInitialLanguage());
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdminLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('vin24_lang', newLang);
    window.dispatchEvent(new Event('languageChange')); // Triggers re-render in client views
  };

  const t = translations[lang] || translations['en'];

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <ShieldCheck className="h-7 w-7 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
          <span className="font-extrabold text-xl tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            vin24.pro
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          <div className="relative group flex items-center bg-slate-800 rounded-full px-3 py-1 border border-slate-700">
            <Globe className="h-4 w-4 text-emerald-400 mr-2" />
            <select 
              value={lang} 
              onChange={handleLangChange} 
              className="bg-transparent text-sm border-none focus:ring-0 text-slate-200 py-1 pr-6 appearance-none cursor-pointer outline-none"
            >
              <option value="en">English</option><option value="ru">Русский</option>
              <option value="uk">Українська</option><option value="ka">ქართული</option>
              <option value="fa">فارسی</option><option value="az">Azərbaycan</option>
              <option value="kk">Қазақша</option><option value="ky">Кыргызча</option>
            </select>
          </div>
          {isAdminLoggedIn ? (
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-sm text-emerald-400 hover:text-emerald-300 font-bold hidden sm:block">Dashboard</Link>
              <button onClick={() => signOut(auth)} className="text-sm text-slate-300 hover:text-white flex items-center">
                <LogOut className="h-4 w-4 mr-1" /><span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white flex items-center transition-colors">
              <Lock className="h-4 w-4 mr-1" /><span className="hidden sm:inline">{t.adminLogin}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}