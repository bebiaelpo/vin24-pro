'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, X, Sparkles, Receipt, CheckCircle, Lock, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Header from '@/components/Header';
import { callGeminiWithRetry } from '@/lib/translations';

const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState([]);
  
  // Dashboard Form State
  const [editingVin, setEditingVin] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [formData, setFormData] = useState({ vin: '', year: '', make: '', model: '', mileage: '', owners: '', engine: '', fuel: '', cylinders: '', options: '', condition: '', titleStatus: 'Clean Title', sellerName: '', sellerLocation: '', msrpStickerPdf: null, windowSticker: null, photos: { auction: [], shipment: [], container: [] } });
  
  const [rawAiText, setRawAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [rawStickerText, setRawStickerText] = useState('');
  const [isStickerLoading, setIsStickerLoading] = useState(false);

  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [draggedCategory, setDraggedCategory] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      const vList = [];
      snapshot.forEach(doc => vList.push(doc.data()));
      setVehicles(vList);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid admin credentials.');
    }
  };

  const handleEdit = (v) => { 
    setEditingVin(v.vin); 
    const safePhotos = v.photos && typeof v.photos === 'object' && !Array.isArray(v.photos)
      ? { auction: [], shipment: [], container: [], ...v.photos }
      : { auction: [], shipment: [], container: [] };
    setFormData({ ...v, photos: safePhotos }); 
  };
  
  const handleNew = () => { 
    setEditingVin('NEW'); 
    setFormData({ vin: '', year: '', make: '', model: '', mileage: '', owners: '', engine: '', fuel: '', cylinders: '', options: '', condition: '', titleStatus: 'Clean Title', sellerName: '', sellerLocation: '', msrpStickerPdf: null, windowSticker: null, photos: { auction: [], shipment: [], container: [] } }); 
  };
  
  const handleDelete = async (vin) => { 
    if (!confirm('Permanently delete this vehicle?')) return;
    try { await deleteDoc(doc(db, 'vehicles', vin)); } 
    catch (err) { console.error(err); } 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const vinUpper = safeStr(formData.vin).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if(!vinUpper) { setSaveError("Valid VIN required."); return; }
      const docRef = doc(db, 'vehicles', vinUpper);
      const safeData = JSON.parse(JSON.stringify({ ...formData, vin: vinUpper }));
      await setDoc(docRef, safeData);
      setEditingVin(null);
    } catch (err) { 
      if (err.message?.includes("size") || err.message?.includes("1048576")) {
        setSaveError("Save failed. Firestore max document size (1MB) reached. Upload fewer photos.");
      } else {
        setSaveError(`Save failed: ${err.message}`);
      }
    }
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setFormData(prev => ({ ...prev, msrpStickerPdf: event.target.result }));
    reader.readAsDataURL(file);
  };

  const handleAiParse = async () => {
    if (!rawAiText.trim()) return;
    setIsAiLoading(true);
    try {
      const schema = { type: "OBJECT", properties: { vin: { type: "STRING" }, year: { type: "STRING" }, make: { type: "STRING" }, model: { type: "STRING" }, mileage: { type: "STRING" }, owners: { type: "STRING" }, engine: { type: "STRING" }, fuel: { type: "STRING" }, cylinders: { type: "STRING" }, options: { type: "STRING" }, condition: { type: "STRING" }, sellerName: { type: "STRING" }, sellerLocation: { type: "STRING" } } };
      const payload = {
          contents: [{ parts: [{ text: `Parse this auction data. Extract VIN, seller name, seller state, year, make, model, engine, fuel, cylinders, options, owners, mileage. Format condition as a strict bulleted list like 'Category: Detail' separated by newlines.\n\nRaw Data:\n${rawAiText}` }] }],
          systemInstruction: { parts: [{ text: "Extract vehicle details into strict JSON structure without conversational text." }] },
          generationConfig: { responseMimeType: "application/json", responseSchema: schema }
      };
      const result = await callGeminiWithRetry(payload);
      const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
          const parsed = JSON.parse(jsonText.replace(/```json/g, '').replace(/```/g, ''));
          setFormData(prev => ({ ...prev, ...parsed }));
          setRawAiText('');
      }
    } catch (err) { console.error(err); }
    setIsAiLoading(false);
  };

  const handleStickerParse = async () => {
    if (!rawStickerText.trim()) return;
    setIsStickerLoading(true);
    try {
      const schema = {
        type: "OBJECT",
        properties: {
          basePrice: { type: "STRING" }, totalPrice: { type: "STRING" },
          mechanical: { type: "ARRAY", items: { type: "STRING" } }, safety: { type: "ARRAY", items: { type: "STRING" } },
          exterior: { type: "ARRAY", items: { type: "STRING" } }, interior: { type: "ARRAY", items: { type: "STRING" } },
          optional: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, price: { type: "STRING" } } } }
        }
      };
      const payload = {
          contents: [{ parts: [{ text: `Parse this raw OCR Window Sticker text into standard Monroney categories. Find base MSRP and total price.\n\nRaw Data:\n${rawStickerText}` }] }],
          systemInstruction: { parts: [{ text: "Extract Monroney window sticker data into structured JSON." }] },
          generationConfig: { responseMimeType: "application/json", responseSchema: schema }
      };
      const result = await callGeminiWithRetry(payload);
      const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
          const parsed = JSON.parse(jsonText.replace(/```json/g, '').replace(/```/g, ''));
          setFormData(prev => ({ ...prev, windowSticker: parsed }));
          setRawStickerText('');
      }
    } catch (err) { console.error(err); }
    setIsStickerLoading(false);
  };

  const handleFileUpload = async (e, category) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newUrls = [];
    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = (event) => {
          const img = new window.Image();
          img.onerror = () => resolve(null);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 600; 
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.5)); 
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
      if (dataUrl) newUrls.push(dataUrl);
    }
    e.target.value = '';
    if (newUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        photos: {
          auction: [],
          shipment: [],
          container: [],
          ...(prev.photos || {}),
          [category]: [...(prev.photos?.[category] || []), ...newUrls]
        }
      }));
    }
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, cat, idx) => {
    setDraggedIdx(idx);
    setDraggedCategory(cat);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, cat, targetIdx) => {
    e.preventDefault();
    if (draggedCategory !== cat || draggedIdx === null || draggedIdx === targetIdx) return;
    const newPhotos = [...(formData.photos?.[cat] || [])];
    const [movedPhoto] = newPhotos.splice(draggedIdx, 1);
    newPhotos.splice(targetIdx, 0, movedPhoto);
    setFormData({ ...formData, photos: { ...formData.photos, [cat]: newPhotos } });
    setDraggedIdx(null);
    setDraggedCategory(null);
  };

  // Button Shift Handlers (for easy mobile reordering)
  const shiftPhoto = (cat, idx, direction) => {
    const newPhotos = [...(formData.photos?.[cat] || [])];
    if (direction === -1 && idx > 0) {
      [newPhotos[idx - 1], newPhotos[idx]] = [newPhotos[idx], newPhotos[idx - 1]];
    } else if (direction === 1 && idx < newPhotos.length - 1) {
      [newPhotos[idx + 1], newPhotos[idx]] = [newPhotos[idx], newPhotos[idx + 1]];
    }
    setFormData({ ...formData, photos: { ...formData.photos, [cat]: newPhotos } });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200">
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-sm"><Lock className="h-8 w-8 text-emerald-400" /></div>
              <h2 className="text-2xl font-extrabold text-slate-900">Admin Login</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border rounded-xl" /></div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Login</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-100 text-slate-900">
      <Header />
      {editingVin ? (
        <div className="flex-grow p-4 sm:p-8 bg-slate-100">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">{editingVin === 'NEW' ? 'Add New Vehicle' : `Edit: ${editingVin}`}</h2>
              <button onClick={() => setEditingVin(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            {saveError && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium">{saveError}</div>}

            <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl shadow-sm">
              <div className="flex items-center mb-2 text-indigo-900 font-bold"><Sparkles className="h-5 w-5 mr-2 text-indigo-600" /> Auto-Fill Specs (Copart/IAAI/OpenLane)</div>
              <textarea value={rawAiText} onChange={e => setRawAiText(e.target.value)} placeholder="Paste auction text here..." className="w-full border border-indigo-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-h-[80px] outline-none" />
              <button type="button" onClick={handleAiParse} disabled={isAiLoading || !rawAiText.trim()} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50 text-sm">
                {isAiLoading ? 'Parsing...' : 'Extract Data'}
              </button>
            </div>

            <div className="mb-8 p-5 bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300 rounded-xl shadow-sm">
              <div className="flex items-center mb-2 text-slate-900 font-bold"><Receipt className="h-5 w-5 mr-2 text-slate-700" /> Build Window Sticker</div>
              <textarea value={rawStickerText} onChange={e => setRawStickerText(e.target.value)} placeholder="Paste raw OCR Window Sticker text here..." className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-slate-500 bg-white min-h-[80px] outline-none" />
              <div className="flex items-center justify-between mt-2">
                <button type="button" onClick={handleStickerParse} disabled={isStickerLoading || !rawStickerText.trim()} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold disabled:opacity-50 text-sm">
                  {isStickerLoading ? 'Building Sticker...' : 'Parse Sticker Data'}
                </button>
                {formData.windowSticker && <span className="text-emerald-600 font-bold flex items-center text-sm"><CheckCircle className="h-4 w-4 mr-1"/> Sticker Loaded</span>}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">VIN</label><input required disabled={editingVin !== 'NEW'} value={formData.vin} onChange={e=>setFormData({...formData, vin: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded-lg p-2.5 disabled:bg-slate-100 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title Status</label><input required value={formData.titleStatus} onChange={e=>setFormData({...formData, titleStatus: e.target.value})} className="w-full border border-emerald-300 rounded-lg p-2.5 font-bold text-emerald-800 bg-emerald-50" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seller Name</label><input value={formData.sellerName || ''} onChange={e=>setFormData({...formData, sellerName: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seller State</label><input value={formData.sellerLocation || ''} onChange={e=>setFormData({...formData, sellerLocation: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label><input value={formData.year} onChange={e=>setFormData({...formData, year: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Make</label><input value={formData.make} onChange={e=>setFormData({...formData, make: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label><input value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mileage</label><input value={formData.mileage} onChange={e=>setFormData({...formData, mileage: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Engine</label><input value={formData.engine} onChange={e=>setFormData({...formData, engine: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cylinders</label><input value={formData.cylinders || ''} onChange={e=>setFormData({...formData, cylinders: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuel Type</label><input value={formData.fuel} onChange={e=>setFormData({...formData, fuel: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">MSRP Sticker PDF (Optional)</label>
                  <div className="flex items-center gap-4">
                    <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer border border-slate-300 rounded-lg p-1.5" />
                    {formData.msrpStickerPdf && <span className="text-emerald-600 text-sm font-bold flex items-center whitespace-nowrap"><CheckCircle className="h-4 w-4 mr-1"/> PDF Ready</span>}
                  </div>
                </div>

                <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Options</label><input value={formData.options} onChange={e=>setFormData({...formData, options: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition (Format: "Category: Description")</label>
                  <textarea rows="4" value={formData.condition} onChange={e=>setFormData({...formData, condition: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-sm"></textarea>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                {['auction', 'shipment', 'container'].map(cat => (
                  <div key={cat} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold capitalize text-slate-700">{cat} Photos</h4>
                      <label className="cursor-pointer bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors select-none">
                        Add Photos
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleFileUpload(e, cat)}
                        />
                      </label>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-4 pt-2">
                      {formData.photos?.[cat]?.map((url, i) => (
                        <div 
                          key={i} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, cat, i)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, cat, i)}
                          className={`relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing group ${draggedIdx === i && draggedCategory === cat ? 'border-indigo-500 opacity-50' : 'border-slate-300 hover:border-slate-500'}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                          
                          {/* Image Hover/Touch Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                            {/* Reorder Buttons (Best for Mobile) */}
                            <div className="flex justify-between items-center w-full mt-1 px-1">
                              <button type="button" onClick={() => shiftPhoto(cat, i, -1)} disabled={i === 0} className="bg-white/25 text-white p-1 rounded hover:bg-white/40 disabled:opacity-30"><ChevronLeft size={16}/></button>
                              <GripVertical size={16} className="text-white/80 cursor-move" />
                              <button type="button" onClick={() => shiftPhoto(cat, i, 1)} disabled={i === formData.photos[cat].length - 1} className="bg-white/25 text-white p-1 rounded hover:bg-white/40 disabled:opacity-30"><ChevronRight size={16}/></button>
                            </div>
                            
                            {/* Delete Button */}
                            <div className="flex justify-center pb-1">
                              <button type="button" onClick={() => { const n = [...formData.photos[cat]]; n.splice(i,1); setFormData({...formData, photos: {...formData.photos, [cat]: n}}); }} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm transition-transform hover:scale-110"><X size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                <button type="button" onClick={() => setEditingVin(null)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-grow p-4 sm:p-8 bg-slate-100">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h1 className="text-2xl font-extrabold text-slate-800">Inventory Database</h1>
              <button onClick={handleNew} className="flex items-center bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                <Plus className="h-5 w-5 mr-2" /> Add Vehicle
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">VIN</th>
                      <th className="px-6 py-4 font-bold">Vehicle</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map(v => (
                      <tr key={v.vin} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{v.vin}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{v.year} {v.make} {v.model}</td>
                        <td className="px-6 py-4 flex justify-end space-x-4">
                          <button onClick={() => handleEdit(v)} className="text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg">Edit</button>
                          <button onClick={() => handleDelete(v.vin)} className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1 rounded-lg">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}