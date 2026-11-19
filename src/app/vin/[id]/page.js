import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Logo from '@/components/Logo';
import VehicleGallery from '@/components/VehicleGallery';
import {
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Gauge,
  Cpu,
  Settings,
  Palette,
  FileText,
  SearchX,
  Car,
  AlertTriangle,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  Info,
  MapPin,
  Fuel,
  Compass,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getVehicleData(vin) {
  try {
    const docRef = doc(db, 'vehicles', vin.toUpperCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error fetching vehicle from Firestore:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const vin = decodeURIComponent(resolvedParams.id).trim().toUpperCase();
  const vehicle = await getVehicleData(vin);

  if (!vehicle) {
    return {
      title: `VIN ${vin} - Vehicle Lookup`,
      description: `Search vehicle specifications, history records, and photos for VIN ${vin} on VIN24.pro.`,
    };
  }

  const titleText = `${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vin}) - Vehicle History & Condition Report`;
  const descText = `Complete vehicle history, condition report${
    vehicle.mileage ? `, odometer (${vehicle.mileage})` : ''
  }${vehicle.primaryDamage ? `, damage record (${vehicle.primaryDamage})` : ''}, and inspection photos for ${vehicle.year} ${vehicle.make} ${vehicle.model} - VIN ${vin}.`;

  return {
    title: titleText,
    description: descText,
    openGraph: {
      title: titleText,
      description: descText,
      images: vehicle.photos?.length > 0 ? [vehicle.photos[0]] : [],
    },
  };
}

export default async function VinLandingPage({ params }) {
  const resolvedParams = await params;
  const vin = decodeURIComponent(resolvedParams.id).trim().toUpperCase();
  const vehicle = await getVehicleData(vin);

  const jsonLd = vehicle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Vehicle',
        name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        vehicleIdentificationNumber: vin,
        manufacturer: vehicle.make,
        model: vehicle.model,
        modelDate: vehicle.year,
        color: vehicle.color || undefined,
        description: vehicle.notes || undefined,
        image: vehicle.photos || [],
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Top Navigation */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/">
            <Logo variant="light" size="md" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>New VIN Search</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {!vehicle ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center max-w-xl mx-auto mt-10">
            <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchX className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">No Vehicle Record Found</h1>
            <p className="text-slate-500 mt-2">
              We do not currently have a published report on file for VIN:
            </p>
            <div className="mt-4 inline-block bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg font-mono text-lg font-bold text-slate-800">
              {vin}
            </div>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                Return to VIN Search
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero Vehicle Summary Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-4 h-4" /> Verified VIN Record
                  </span>
                  {vehicle.titleStatus && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                      <FileCheck2 className="w-3.5 h-3.5" /> {vehicle.titleStatus}
                    </span>
                  )}
                  {vehicle.lotNumber && (
                    <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full">
                      Lot #{vehicle.lotNumber}
                    </span>
                  )}
                </div>

                {vehicle.uploadDate && (
                  <span className="text-xs text-slate-400 font-medium">
                    Archive Date:{' '}
                    {new Date(vehicle.uploadDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    Official Vehicle History, Condition Disclosure &amp; Inspection Photo Report
                  </p>
                </div>

                <div className="bg-slate-950 text-white px-5 py-3 rounded-xl flex flex-col justify-center shrink-0 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Vehicle Identification Number (VIN)
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-bold text-blue-400 tracking-wider mt-0.5">
                    {vin}
                  </span>
                </div>
              </div>

              {/* 4 Key Condition Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Gauge className="w-4 h-4 text-blue-600" /> Odometer
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {vehicle.mileage || 'Not Listed'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Primary Damage
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {vehicle.primaryDamage || 'None / Not Listed'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" /> Title / Document
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {vehicle.titleStatus || 'Standard / On File'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <KeyRound className="w-4 h-4 text-emerald-600" /> Keys Status
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {vehicle.keys || 'Not Specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Two-Column Report Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 Columns: Photo Gallery, Decoded Table, Notes */}
              <div className="lg:col-span-2 space-y-6">
                <VehicleGallery
                  photos={vehicle.photos || []}
                  title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                />

                {/* Structured Auction & Condition Data Table */}
                {Array.isArray(vehicle.reportDetails) && vehicle.reportDetails.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <span>Decoded Auction &amp; Condition Report</span>
                      </h2>
                      <span className="text-xs font-semibold text-slate-500">
                        {vehicle.reportDetails.length} Verified Fields
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {vehicle.reportDetails.map((item, idx) => (
                        <div
                          key={idx}
                          className={`px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {item.label}
                          </span>
                          <span className="sm:col-span-2 text-sm font-semibold text-slate-900">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formatted Condition & History Summary */}
                {vehicle.notes && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span>Condition &amp; History Notes</span>
                    </h2>
                    <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {vehicle.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Technical Specs + VIN Structure */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-950 text-white">
                    <h2 className="text-base font-bold tracking-wide">Technical Specifications</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                      <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Model Year</p>
                        <p className="text-sm font-bold text-slate-900">{vehicle.year || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                      <Car className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Make &amp; Model</p>
                        <p className="text-sm font-bold text-slate-900">
                          {vehicle.make} {vehicle.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                      <Cpu className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Engine</p>
                        <p className="text-sm font-bold text-slate-900">
                          {vehicle.engine || 'Not Specified'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                      <Settings className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Transmission</p>
                        <p className="text-sm font-bold text-slate-900">
                          {vehicle.transmission || 'Not Specified'}
                        </p>
                      </div>
                    </div>

                    {vehicle.drivetrain && (
                      <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                        <Compass className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Drivetrain</p>
                          <p className="text-sm font-bold text-slate-900">{vehicle.drivetrain}</p>
                        </div>
                      </div>
                    )}

                    {vehicle.fuelType && (
                      <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                        <Fuel className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Fuel Type</p>
                          <p className="text-sm font-bold text-slate-900">{vehicle.fuelType}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                      <Palette className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Exterior Color</p>
                        <p className="text-sm font-bold text-slate-900">
                          {vehicle.color || 'Not Specified'}
                        </p>
                      </div>
                    </div>

                    {vehicle.secondaryDamage && (
                      <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Secondary Damage</p>
                          <p className="text-sm font-bold text-slate-900">{vehicle.secondaryDamage}</p>
                        </div>
                      </div>
                    )}

                    {vehicle.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Sale / Yard Location</p>
                          <p className="text-sm font-bold text-slate-900">{vehicle.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* VIN Structure Check Box */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>VIN Structure Check</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">WMI (Manufacturer)</span>
                      <span className="font-mono font-bold text-slate-800">{vin.slice(0, 3)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">VDS (Vehicle Descriptor)</span>
                      <span className="font-mono font-bold text-slate-800">{vin.slice(3, 9)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">VIS (Serial Identifier)</span>
                      <span className="font-mono font-bold text-slate-800">{vin.slice(9, 17)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 py-6 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <Logo variant="light" size="md" />
          <p>© {new Date().getFullYear()} VIN24.pro. All vehicle records archived for buyer verification.</p>
        </div>
      </footer>
    </div>
  );
}