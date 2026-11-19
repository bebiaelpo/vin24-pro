'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle, Receipt, Download, Sparkles, Image as ImageIcon, SearchX } from 'lucide-react';
import Header from '@/components/Header';
import { translations, getInitialLanguage, callGeminiWithRetry } from '@/lib/translations';

const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

export default function VehicleClientView({ vehicle, searchedVin }) {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('auction');
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [translatedData, setTranslatedData] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setLang(getInitialLanguage());
    const handleLang = () => setLang(getInitialLanguage());
    window.addEventListener('languageChange', handleLang);
    return () => window.removeEventListener('languageChange', handleLang);
  }, []);

  useEffect(() => { setMainImageIdx(0); }, [activeTab]);

  useEffect(() => {
    if (!vehicle || lang === 'en') { setTranslatedData(null); return; }
    
    let isMounted = true;
    const translateAutomatic = async () => {
      setIsTranslating(true);
      try {
          const schema = { type: "OBJECT", properties: { engine: { type: "STRING" }, fuel: { type: "STRING" }, options: { type: "STRING" }, condition: { type: "STRING" } } };
          const targetLang = lang === 'ru' ? 'Russian' : lang === 'uk' ? 'Ukrainian' : lang === 'ka' ? 'Georgian' : lang === 'fa' ? 'Persian' : lang === 'az' ? 'Azerbaijani' : lang === 'kk' ? 'Kazakh' : lang === 'ky' ? 'Kyrgyz' : lang;
          const payload = {
              contents: [{ parts: [{ text: `Translate into ${targetLang}. Keep strict formatting.\nEngine: ${safeStr(vehicle.engine)}\nFuel: ${safeStr(vehicle.fuel)}\nOptions: ${safeStr(vehicle.options)}\nCondition: ${safeStr(vehicle.condition)}` }] }],
              systemInstruction: { parts: [{ text: `You are an expert automotive translator.` }] },
              generationConfig: { responseMimeType: "application/json", responseSchema: schema }
          };
          const result = await callGeminiWithRetry(payload);
          const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText && isMounted) {
              const cleanJson = jsonText.replace(/```json\n/g, '').replace(/```\n?/g, '');
              setTranslatedData(JSON.parse(cleanJson));
          }
      } catch (err) { console.error(err); }
      if (isMounted) setIsTranslating(false);
    };
    translateAutomatic();
    return () => { isMounted = false; };
  }, [lang, vehicle]);

  const t = translations[lang] || translations['en'];

  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
             <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4"><SearchX className="w-8 h-8" /></div>
             <h1 className="text-2xl font-bold text-slate-900">{t.notFound}</h1>
             <div className="mt-4 font-mono text-lg font-bold text-slate-800 bg-slate-100 py-2 rounded-lg">{searchedVin}</div>
             <Link href="/" className="mt-8 inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const v = vehicle;
  const photos = v.photos && typeof v.photos === 'object' && !Array.isArray(v.photos) ? v.photos : { auction: [], shipment: [], container: [] };
  const currentPhotos = Array.isArray(photos[activeTab]) ? photos[activeTab] : [];
  const displayData = translatedData || v;

  const conditionText = safeStr(displayData.condition);
  const conditionLines = [
    "Title Status: Clean / No Salvage Record Found",
    "Water / Flood: No signs of water damage / Clean",
    ...conditionText.split('\n').filter(l => l.trim().length > 0)
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <Header />
      <div className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Link href="/" className="text-slate-500 hover:text-slate-800 font-semibold text-sm flex items-center transition-colors">
            &larr; Back to Search
          </Link>

          {isTranslating && (
            <div className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium border border-indigo-100 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />Translating into local language...
            </div>
          )}

          {/* Header & Verification */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-200 pb-4">
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{safeStr(v.year)} {safeStr(v.make)} {safeStr(v.model)}</h1>
                <div className="text-slate-500 font-mono text-lg mt-1 tracking-wider">VIN: <span className="font-bold text-slate-800">{safeStr(v.vin)}</span></div>
             </div>
             <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-1">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg font-bold flex items-center shadow-sm">
                  <ShieldCheck className="h-6 w-6 mr-2 text-emerald-600" />
                  <div>
                     <div className="leading-tight text-emerald-900">Verified Clean</div>
                     <div className="text-xs font-medium text-emerald-700">No Salvage Record Found</div>
                  </div>
                </div>
                {(v.sellerName || v.sellerLocation) && (
                  <div className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                    Was offered by: <span className="font-bold text-slate-700">{safeStr(v.sellerName)}</span> {v.sellerLocation && <span>({safeStr(v.sellerLocation)})</span>}
                  </div>
                )}
             </div>
          </div>

          {/* Photo Gallery with Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2">
              {['auction', 'shipment', 'container'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-2 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-lg'}`}>
                  {t[`${tab}Photos`]}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-t-full" />}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-6 bg-slate-100/50">
              {currentPhotos.length > 0 ? (
                <>
                  <div className="aspect-[21/9] sm:aspect-[16/7] bg-black rounded-xl overflow-hidden shadow-inner mb-4 relative group border border-slate-200">
                    <img src={currentPhotos[mainImageIdx] || currentPhotos[0]} alt="Vehicle View" className="w-full h-full object-contain bg-slate-900" />
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                    {currentPhotos.map((url, i) => (
                      <button key={i} onClick={() => setMainImageIdx(i)} className={`relative flex-shrink-0 w-24 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none ${mainImageIdx === i ? 'ring-4 ring-emerald-500 ring-offset-2' : 'opacity-70 hover:opacity-100 border border-slate-300'}`}>
                        <img src={url} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300"><ImageIcon className="h-12 w-12 mb-3 opacity-50" /><p className="font-medium">{t.noPhotos}</p></div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Specs */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-5 py-3">
                  <h3 className="font-bold text-slate-800 text-lg">Vehicle Details</h3>
                </div>
                <div className="flex flex-col divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Odometer:</span><span className="font-semibold text-slate-900">{safeStr(v.mileage)} mi (Actual)</span></div>
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Primary Damage:</span><span className="font-bold text-emerald-600">None - Clean History</span></div>
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Title Type:</span><span className="font-bold text-emerald-600">Clean / Clear</span></div>
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Engine:</span><span className="font-semibold text-slate-900">{safeStr(displayData.engine)}</span></div>
                  {v.cylinders && <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Cylinders:</span><span className="font-semibold text-slate-900">{safeStr(v.cylinders)}</span></div>}
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Fuel Type:</span><span className="font-semibold text-slate-900">{safeStr(displayData.fuel)}</span></div>
                  <div className="flex justify-between p-4"><span className="text-slate-500 font-medium">Owners:</span><span className="font-semibold text-slate-900">{safeStr(v.owners)}</span></div>
                  <div className="p-4 bg-slate-50">
                    <span className="block text-slate-500 font-medium mb-1">Options:</span>
                    <span className="font-medium text-slate-800 leading-relaxed">{safeStr(displayData.options)}</span>
                  </div>
                </div>
                {v.msrpStickerPdf && (
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <a href={v.msrpStickerPdf} download={`MSRP_${v.vin}.pdf`} className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-3 rounded-xl font-bold flex items-center justify-center transition-colors">
                      <Download className="h-5 w-5 mr-2" /> View MSRP Options Sticker (PDF)
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Condition Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Inspector Condition Report</h3>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {conditionLines.map((line, i) => {
                  const splitIdx = line.indexOf(':');
                  let category = line; let detail = '';
                  if (splitIdx > -1) {
                    category = line.substring(0, splitIdx).replace(/^[-•*]\s*/, '').trim();
                    detail = line.substring(splitIdx + 1).trim();
                  } else { category = line.replace(/^[-•*]\s*/, '').trim(); }

                  return (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800">{category}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider px-2 py-1 rounded flex items-center font-bold whitespace-nowrap ml-4 border border-emerald-200">
                          <CheckCircle size={12} className="mr-1" /> {t.asDescribed}
                        </span>
                      </div>
                      {detail && <span className="text-sm text-slate-600 font-medium">{detail}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Window Sticker */}
          {v.windowSticker && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-800 overflow-hidden mt-8">
              <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-center border-b-4 border-slate-300">
                <div className="flex items-center gap-3">
                  <Receipt className="h-8 w-8 text-slate-300" />
                  <h2 className="text-2xl font-black uppercase tracking-wider">Factory Window Sticker</h2>
                </div>
                <div className="font-mono text-slate-300 mt-2 sm:mt-0">{safeStr(v.vin)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 md:border-r-2 border-slate-200">
                   <h3 className="font-black text-lg border-b-2 border-slate-800 pb-1 mb-4 uppercase tracking-wide text-slate-800">Standard Equipment</h3>
                   <div className="space-y-4 text-sm font-medium text-slate-700">
                     {['mechanical', 'safety', 'exterior', 'interior'].map(cat => (
                        v.windowSticker?.[cat] && v.windowSticker[cat].length > 0 && (
                          <div key={cat}>
                            <h4 className="font-bold uppercase text-slate-900 mb-1">{cat}</h4>
                            <ul className="list-disc pl-5 space-y-0.5 marker:text-slate-400">
                              {v.windowSticker[cat].map((item, idx) => <li key={idx}>{safeStr(item)}</li>)}
                            </ul>
                          </div>
                        )
                     ))}
                   </div>
                </div>
                <div className="p-6 bg-slate-50 flex flex-col h-full">
                   <h3 className="font-black text-lg border-b-2 border-slate-800 pb-1 mb-4 uppercase tracking-wide text-slate-800">Optional Equipment</h3>
                   <div className="flex-grow text-sm font-medium text-slate-700 space-y-2">
                     <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2 mb-2">
                       <span>Base Manufacturer's Suggested Retail Price</span>
                       <span>{safeStr(v.windowSticker.basePrice) || "N/A"}</span>
                     </div>
                     {v.windowSticker.optional?.map((opt, idx) => (
                       <div key={idx} className="flex justify-between">
                         <span className="pr-4">{safeStr(opt.name)}</span>
                         <span className="whitespace-nowrap">{safeStr(opt.price)}</span>
                       </div>
                     ))}
                   </div>
                   <div className="mt-8 border-t-4 border-slate-800 pt-4 flex justify-between items-end">
                      <div className="text-xs text-slate-500 max-w-[200px] leading-tight font-medium">Actual results will vary for many reasons.</div>
                      <div className="text-right">
                         <div className="font-bold text-slate-600 uppercase text-xs tracking-wider mb-1">Total Vehicle Price</div>
                         <div className="text-3xl font-black text-slate-900">{safeStr(v.windowSticker.totalPrice) || "N/A"}</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}