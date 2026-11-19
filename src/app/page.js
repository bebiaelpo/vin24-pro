'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import { translations, getInitialLanguage } from '@/lib/translations';

export default function HomePage() {
  const [searchVin, setSearchVin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lang, setLang] = useState('en');
  const router = useRouter();

  useEffect(() => {
    setLang(getInitialLanguage());
    const handleLang = () => setLang(getInitialLanguage());
    window.addEventListener('languageChange', handleLang);
    return () => window.removeEventListener('languageChange', handleLang);
  }, []);

  const t = translations[lang] || translations['en'];

  const handleSearch = (e) => {
    e.preventDefault();
    const vinUpper = searchVin.trim().toUpperCase();
    if (vinUpper.length < 3) return;
    setIsLoading(true);
    router.push(`/vin/${vinUpper}`);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-emerald-200">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div>
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-200">
              <ShieldCheck className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">{t.title}</h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">{t.subtitle}</p>
          </div>
          <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto">
            <div className="relative flex items-center shadow-lg rounded-full bg-white">
              <Search className="absolute left-5 h-6 w-6 text-slate-400" />
              <input 
                type="text" 
                value={searchVin} 
                onChange={(e) => { setSearchVin(e.target.value.toUpperCase()); setSearchError(''); }} 
                placeholder={t.enterVin} 
                className="w-full pl-14 pr-32 py-5 rounded-full border-2 border-transparent text-lg focus:outline-none focus:border-emerald-500 transition-all uppercase placeholder:normal-case font-mono bg-white/50 backdrop-blur-sm" 
                maxLength={17} 
              />
              <button 
                type="submit" 
                disabled={isLoading || searchVin.length < 3} 
                className="absolute right-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all shadow-md"
              >
                {isLoading ? '...' : t.search}
              </button>
            </div>
            {searchError && (
              <div className="mt-4 flex items-center justify-center text-red-600 bg-red-50 py-2 px-4 rounded-full max-w-md mx-auto border border-red-100 shadow-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm">{searchError}</span>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}