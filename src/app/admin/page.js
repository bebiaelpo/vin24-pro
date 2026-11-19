'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Logo from '@/components/Logo';
import {
  Trash2,
  Upload,
  LogOut,
  Plus,
  CheckCircle,
  AlertCircle,
  Wand2,
  Sparkles,
  Pencil,
  X,
  Loader2,
  Search,
  ExternalLink,
} from 'lucide-react';

function formatTitleCase(str) {
  if (!str) return '';
  const acronyms = [
    'BMW', 'GMC', 'VW', 'RAM', 'SRT', 'GT', 'SE', 'LE', 'XLE', 'XSE',
    'AWD', 'FWD', 'RWD', '4WD', 'SUV', 'LTD', 'EX', 'LX', 'DX', 'SI',
  ];
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (acronyms.includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function decodeAuctionText(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const pairs = [];
  const leftoverNotes = [];

  const knownLabels = [
    'vin', 'lot', 'lot number', 'lot #', 'odometer', 'mileage',
    'primary damage', 'secondary damage', 'title', 'title type',
    'title/sale doc', 'sale document', 'doc type', 'keys', 'highlights',
    'start code', 'run & drive', 'engine', 'engine type', 'cylinders',
    'transmission', 'drive', 'drivetrain', 'fuel', 'fuel type',
    'color', 'exterior color', 'interior color', 'body style',
    'vehicle type', 'loss', 'loss type', 'damage', 'est. retail value',
    'estimated retail value', 'actual cash value', 'acv', 'repair cost',
    'sale date', 'location', 'seller', 'airbags', 'notes', 'condition',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Case 1: "Label: Value" or "Label\tValue"
    const colonMatch = line.match(/^([^:\t]{2,35})[:\t]\s*(.+)$/);
    if (colonMatch) {
      pairs.push({ label: colonMatch[1].trim(), value: colonMatch[2].trim() });
      continue;
    }

    // Case 2: Copied HTML table where Label is on line i and Value is on line i+1
    const normalizedLabel = line.replace(/:$/, '').toLowerCase();
    if (knownLabels.includes(normalizedLabel) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (!knownLabels.includes(nextLine.replace(/:$/, '').toLowerCase())) {
        pairs.push({ label: formatTitleCase(normalizedLabel), value: nextLine });
        i++;
        continue;
      }
    }

    leftoverNotes.push(line);
  }

  const extracted = {
    vin: '',
    lotNumber: '',
    mileage: '',
    primaryDamage: '',
    secondaryDamage: '',
    titleStatus: '',
    keys: '',
    engine: '',
    transmission: '',
    drivetrain: '',
    fuelType: '',
    color: '',
    location: '',
    reportDetails: [],
    formattedNotes: '',
  };

  const seenLabels = new Set();

  pairs.forEach(({ label, value }) => {
    const key = label.toLowerCase();
    if (seenLabels.has(key)) return;
    seenLabels.add(key);

    if (key === 'vin' && value.length >= 11) {
      extracted.vin = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 17);
    } else if (key.includes('lot')) {
      extracted.lotNumber = value.replace(/^#/, '');
    } else if (key.includes('odometer') || key.includes('mileage')) {
      extracted.mileage = value;
    } else if (key.includes('primary damage') || key === 'damage') {
      extracted.primaryDamage = value;
    } else if (key.includes('secondary damage')) {
      extracted.secondaryDamage = value;
    } else if (key.includes('title') || key.includes('sale doc') || key.includes('doc type')) {
      extracted.titleStatus = value;
    } else if (key === 'keys') {
      extracted.keys = value;
    } else if (key.includes('engine')) {
      extracted.engine = value;
    } else if (key.includes('transmission')) {
      extracted.transmission = value;
    } else if (key.includes('drive')) {
      extracted.drivetrain = value;
    } else if (key.includes('fuel')) {
      extracted.fuelType = value;
    } else if (key.includes('color') && !key.includes('interior')) {
      extracted.color = value;
    } else if (key.includes('location')) {
      extracted.location = value;
    }

    if (key !== 'vin') {
      extracted.reportDetails.push({
        label: formatTitleCase(label),
        value,
      });
    }
  });

  const formattedLines = [];
  if (extracted.reportDetails.length > 0) {
    extracted.reportDetails.forEach((item) => {
      formattedLines.push(`• ${item.label}: ${item.value}`);
    });
  }
  if (leftoverNotes.length > 0) {
    if (formattedLines.length > 0) formattedLines.push('');
    leftoverNotes.forEach((note) => {
      formattedLines.push(note.startsWith('•') ? note : `• ${note}`);
    });
  }

  extracted.formattedNotes = formattedLines.join('\n');
  return extracted;
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Form state
  const [editingVin, setEditingVin] = useState(null);
  const [vin, setVin] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('');
  const [drivetrain, setDrivetrain] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [color, setColor] = useState('');
  const [titleStatus, setTitleStatus] = useState('');
  const [primaryDamage, setPrimaryDamage] = useState('');
  const [secondaryDamage, setSecondaryDamage] = useState('');
  const [keys, setKeys] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reportDetails, setReportDetails] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);

  // UI & Inventory state
  const [decodingVin, setDecodingVin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [vehicles, setVehicles] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
      setVehicles(list);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError('Invalid email or password. Check your Firebase Authentication users.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleDecodeVin = async (targetVin = vin) => {
    const cleanVin = targetVin.trim().toUpperCase();
    if (cleanVin.length !== 17) {
      setStatusMsg({ type: 'error', text: 'Enter a full 17-character VIN first to auto-decode.' });
      return;
    }

    setDecodingVin(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanVin}?format=json`
      );
      const data = await res.json();
      const info = data?.Results?.[0];

      if (!info || (!info.Make && !info.ModelYear)) {
        setStatusMsg({
          type: 'error',
          text: 'Could not auto-decode this VIN from NHTSA. Enter details manually.',
        });
        return;
      }

      if (info.ModelYear) setYear(info.ModelYear);
      if (info.Make) setMake(formatTitleCase(info.Make));

      const modelParts = [info.Model, info.Trim].filter(Boolean).join(' ');
      if (modelParts) setModel(formatTitleCase(modelParts));

      const engineParts = [];
      if (info.DisplacementL) engineParts.push(`${parseFloat(info.DisplacementL).toFixed(1)}L`);
      if (info.EngineCylinders) engineParts.push(`${info.EngineCylinders}-Cyl`);
      if (engineParts.length > 0) setEngine(engineParts.join(' '));

      if (info.TransmissionStyle) setTransmission(formatTitleCase(info.TransmissionStyle));
      if (info.DriveType) setDrivetrain(info.DriveType.toUpperCase());
      if (info.FuelTypePrimary) setFuelType(formatTitleCase(info.FuelTypePrimary));

      setStatusMsg({
        type: 'success',
        text: `Auto-Decoded: ${info.ModelYear || ''} ${formatTitleCase(info.Make)} ${formatTitleCase(info.Model)}`,
      });
    } catch (error) {
      console.error('VIN Decode error:', error);
      setStatusMsg({ type: 'error', text: 'VIN lookup failed. Check your connection.' });
    } finally {
      setDecodingVin(false);
    }
  };

  const handleSmartFormatNotes = () => {
    if (!notes.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Paste raw auction condition/history text into the Notes box first.',
      });
      return;
    }

    const decoded = decodeAuctionText(notes);

    if (decoded.vin && !vin) {
      setVin(decoded.vin);
      if (decoded.vin.length === 17) handleDecodeVin(decoded.vin);
    }
    if (decoded.lotNumber) setLotNumber(decoded.lotNumber);
    if (decoded.mileage) setMileage(decoded.mileage);
    if (decoded.primaryDamage) setPrimaryDamage(decoded.primaryDamage);
    if (decoded.secondaryDamage) setSecondaryDamage(decoded.secondaryDamage);
    if (decoded.titleStatus) setTitleStatus(decoded.titleStatus);
    if (decoded.keys) setKeys(decoded.keys);
    if (decoded.engine && !engine) setEngine(decoded.engine);
    if (decoded.transmission && !transmission) setTransmission(decoded.transmission);
    if (decoded.drivetrain && !drivetrain) setDrivetrain(decoded.drivetrain);
    if (decoded.fuelType && !fuelType) setFuelType(decoded.fuelType);
    if (decoded.color) setColor(decoded.color);
    if (decoded.location) setLocation(decoded.location);

    setReportDetails(decoded.reportDetails);
    setNotes(decoded.formattedNotes);

    setStatusMsg({
      type: 'success',
      text: `Decoded ${decoded.reportDetails.length} auction fields and formatted the report cleanly!`,
    });
  };

  const resetForm = () => {
    setEditingVin(null);
    setVin('');
    setLotNumber('');
    setYear('');
    setMake('');
    setModel('');
    setMileage('');
    setEngine('');
    setTransmission('');
    setDrivetrain('');
    setFuelType('');
    setColor('');
    setTitleStatus('');
    setPrimaryDamage('');
    setSecondaryDamage('');
    setKeys('');
    setLocation('');
    setNotes('');
    setReportDetails([]);
    setExistingPhotos([]);
    setNewPhotos([]);
    const input = document.getElementById('photo-input');
    if (input) input.value = '';
  };

  const handleStartEdit = (vehicle) => {
    setEditingVin(vehicle.vin);
    setVin(vehicle.vin || '');
    setLotNumber(vehicle.lotNumber || '');
    setYear(vehicle.year || '');
    setMake(vehicle.make || '');
    setModel(vehicle.model || '');
    setMileage(vehicle.mileage || '');
    setEngine(vehicle.engine || '');
    setTransmission(vehicle.transmission || '');
    setDrivetrain(vehicle.drivetrain || '');
    setFuelType(vehicle.fuelType || '');
    setColor(vehicle.color || '');
    setTitleStatus(vehicle.titleStatus || '');
    setPrimaryDamage(vehicle.primaryDamage || '');
    setSecondaryDamage(vehicle.secondaryDamage || '');
    setKeys(vehicle.keys || '');
    setLocation(vehicle.location || '');
    setNotes(vehicle.notes || '');
    setReportDetails(Array.isArray(vehicle.reportDetails) ? vehicle.reportDetails : []);
    setExistingPhotos(Array.isArray(vehicle.photos) ? vehicle.photos : []);
    setNewPhotos([]);
    setStatusMsg({
      type: 'success',
      text: `Editing VIN ${vehicle.vin}. Make your changes and click Update.`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveExistingPhoto = (indexToRemove) => {
    setExistingPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    const cleanVin = vin.trim().toUpperCase();
    if (cleanVin.length !== 17) {
      setStatusMsg({ type: 'error', text: 'VIN must be exactly 17 characters.' });
      return;
    }

    setUploading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const uploadedUrls = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const file = newPhotos[i];
        const storageRef = ref(storage, `vehicles/${cleanVin}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      const finalPhotos = [...existingPhotos, ...uploadedUrls];

      await setDoc(doc(db, 'vehicles', cleanVin), {
        vin: cleanVin,
        lotNumber: lotNumber.trim(),
        year: year.trim(),
        make: make.trim(),
        model: model.trim(),
        mileage: mileage.trim(),
        engine: engine.trim(),
        transmission: transmission.trim(),
        drivetrain: drivetrain.trim(),
        fuelType: fuelType.trim(),
        color: color.trim(),
        titleStatus: titleStatus.trim(),
        primaryDamage: primaryDamage.trim(),
        secondaryDamage: secondaryDamage.trim(),
        keys: keys.trim(),
        location: location.trim(),
        notes: notes.trim(),
        reportDetails,
        photos: finalPhotos,
        uploadDate: new Date().toISOString(),
      });

      setStatusMsg({
        type: 'success',
        text: editingVin
          ? `Vehicle ${cleanVin} updated successfully!`
          : `Vehicle ${cleanVin} published and added to sitemap!`,
      });

      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      setStatusMsg({ type: 'error', text: 'Failed to save vehicle. Check Firebase permissions.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm(`Are you sure you want to permanently delete VIN ${vehicleId}?`)) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      if (editingVin === vehicleId) resetForm();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete vehicle.');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchFilter.toLowerCase();
    return (
      v.vin?.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.year?.toString().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading Admin Portal...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <Logo variant="dark" size="lg" />
            <p className="text-sm text-slate-500 mt-3">Sign in to manage VIN24.pro inventory</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="admin@vin24.pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12">
      <header className="bg-slate-950 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Logo variant="light" size="md" />
            </Link>
            <span className="text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg text-sm transition"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Add / Edit Vehicle Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editingVin ? (
                <>
                  <Pencil className="w-5 h-5 text-amber-600" /> Edit Vehicle: {editingVin}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-blue-600" /> Add New Vehicle Report
                </>
              )}
            </h1>

            {editingVin && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" /> Cancel Edit
              </button>
            )}
          </div>

          {statusMsg.text && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveVehicle} className="space-y-4">
            {/* VIN Input + 1-Click Auto Decode */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                17-Digit VIN *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={17}
                  disabled={Boolean(editingVin)}
                  value={vin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                    setVin(val);
                    if (val.length === 17 && !editingVin) {
                      handleDecodeVin(val);
                    }
                  }}
                  placeholder="Enter 17-digit VIN to auto-fill specs..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-600 outline-none disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleDecodeVin(vin)}
                  disabled={decodingVin || vin.length !== 17}
                  className="shrink-0 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
                >
                  {decodingVin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 text-blue-400" />
                  )}
                  <span>{decodingVin ? 'Decoding...' : 'Auto-Decode'}</span>
                </button>
              </div>
            </div>

            {/* Primary Vehicle Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Year *</label>
                <input
                  type="text"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2022"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Make *</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Toyota"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Camry SE"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            {/* Technical & Auction Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Engine</label>
                <input
                  type="text"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  placeholder="2.5L 4-Cyl"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Transmission</label>
                <input
                  type="text"
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  placeholder="Automatic"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Drivetrain</label>
                <input
                  type="text"
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  placeholder="AWD / FWD / RWD"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Fuel Type</label>
                <input
                  type="text"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  placeholder="Gasoline / Hybrid / Electric"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Odometer / Mileage</label>
                <input
                  type="text"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="45,200 mi (Actual)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Exterior Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Black"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title / Sale Doc</label>
                <input
                  type="text"
                  value={titleStatus}
                  onChange={(e) => setTitleStatus(e.target.value)}
                  placeholder="Clean Title / Salvage Certificate"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Keys Status</label>
                <input
                  type="text"
                  value={keys}
                  onChange={(e) => setKeys(e.target.value)}
                  placeholder="Yes / Present"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Primary Damage</label>
                <input
                  type="text"
                  value={primaryDamage}
                  onChange={(e) => setPrimaryDamage(e.target.value)}
                  placeholder="Front End / Minor Dent"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Secondary Damage</label>
                <input
                  type="text"
                  value={secondaryDamage}
                  onChange={(e) => setSecondaryDamage(e.target.value)}
                  placeholder="None / Rear Bumper"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Lot Number</label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. 58492014"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Sale / Yard Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Savannah, GA"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            {/* Smart Auction Paste Decoder */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Condition &amp; History Notes (Paste Raw Auction Text)
                </label>
                <button
                  type="button"
                  onClick={handleSmartFormatNotes}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Decode &amp; Format Raw Text</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste raw auction condition text here (Copart, IAAI, Manheim, etc.) and click 'Decode & Format Raw Text'..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
              {reportDetails.length > 0 && (
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  ✓ {reportDetails.length} structured attributes extracted for the report table.
                </p>
              )}
            </div>

            {/* Existing Photos (When Editing) */}
            {existingPhotos.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  Current Saved Photos ({existingPhotos.length})
                </label>
                <div className="flex flex-wrap gap-3">
                  {existingPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-300"
                    >
                      <img src={url} alt={`Saved ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingPhoto(idx)}
                        title="Remove Photo"
                        className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full opacity-90 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Photos */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                {editingVin ? 'Add More Photos' : 'Vehicle Photos'}
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 transition">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <input
                  id="photo-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && setNewPhotos(Array.from(e.target.files))}
                  className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {newPhotos.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {newPhotos.length} new file(s) ready to upload
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className={`w-full font-bold py-3.5 rounded-xl transition shadow-sm text-white ${
                editingVin
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
              }`}
            >
              {uploading
                ? 'Uploading Photos & Saving...'
                : editingVin
                ? 'Update Vehicle Report'
                : 'Publish Vehicle Page'}
            </button>
          </form>
        </div>

        {/* Right Column: Searchable Inventory List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            Published Vehicles ({vehicles.length})
          </h2>

          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by VIN, make, model..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {filteredVehicles.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No matching vehicles found.</p>
          ) : (
            <div className="space-y-3 max-h-[760px] overflow-y-auto pr-1">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  className={`p-3 border rounded-xl flex items-center justify-between gap-2 transition ${
                    editingVin === v.vin
                      ? 'border-amber-500 bg-amber-50/60'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="overflow-hidden">
                    <a
                      href={`/vin/${v.vin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm font-bold text-blue-600 hover:underline inline-flex items-center gap-1 truncate"
                    >
                      <span>{v.vin}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {v.photos?.length || 0} photo(s)
                      {v.primaryDamage ? ` • ${v.primaryDamage}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(v)}
                      title="Edit Vehicle"
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      title="Delete Vehicle"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}