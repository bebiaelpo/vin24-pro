'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Search, ShieldCheck, Camera, FileSpreadsheet, AlertCircle, ArrowRight } from 'lucide-react';

export default function Home() {
  const [vin, setVin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleVinChange = (e) => {
    const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 17);
    setVin(cleaned);
    if (error) setError('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (vin.length !== 17) {
      setError(`Please enter a complete 17-character VIN (currently ${vin.length}/17).`);
      return;
    }
    router.push(`/vin/${vin}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo variant="light" size="md" />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 hidden sm:inline">
            Vehicle Inquiry Network
          </span>
        </div>
      </header>

      {/* Hero Search Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl w-full text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Permanent VIN Archive &amp; Condition Lookup</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Check Vehicle History &amp; Auction Records by VIN
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mt-4 max-w-xl mx-auto">
            Enter any 17-character Vehicle Identification Number to inspect verified odometer logs,
            damage disclosures, technical specs, and photo archives.
          </p>

          {/* Search Card */}
          <div className="mt-8 bg-white rounded-2xl p-3 sm:p-4 shadow-2xl shadow-black/50 text-slate-900">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={vin}
                  onChange={handleVinChange}
                  placeholder="ENTER 17-DIGIT VIN (e.g. 1HGCM82633A004352)"
                  maxLength={17}
                  className="w-full h-14 pl-4 pr-16 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl font-mono text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 outline-none transition"
                />
                <span
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    vin.length === 17
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {vin.length}/17
                </span>
              </div>

              <button
                type="submit"
                className="h-14 px-7 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 shrink-0"
              >
                <Search className="w-5 h-5" />
                <span>Search VIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {error && (
              <div className="mt-3 text-left flex items-center gap-2 text-xs font-semibold text-red-600 px-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* 3 Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 text-left">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2.5" />
              <h2 className="font-bold text-sm text-white">Decoded Condition Logs</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Structured title status, odometer readings, primary damage, and lot disclosures.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <Camera className="w-6 h-6 text-blue-400 mb-2.5" />
              <h2 className="font-bold text-sm text-white">High-Res Photo Archive</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Multi-angle inspection imagery with fullscreen zoom for complete transparency.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <ShieldCheck className="w-6 h-6 text-blue-400 mb-2.5" />
              <h2 className="font-bold text-sm text-white">Factory VIN Decoding</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Verified manufacturer build specifications, engine configuration, and VIN structure.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} VIN24.pro — Professional Vehicle Inquiry Network.</p>
          <Link href="/admin" className="text-slate-600 hover:text-slate-400 transition">
            Admin Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}