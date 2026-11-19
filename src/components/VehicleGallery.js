'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Camera } from 'lucide-react';

export default function VehicleGallery({ photos = [], title = 'Vehicle' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!Array.isArray(photos) || photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-500">
          No inspection photos uploaded for this vehicle.
        </p>
      </div>
    );
  }

  const handlePrev = (e) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Main Hero Photo */}
        <div
          onClick={() => setLightboxOpen(true)}
          className="relative bg-slate-950 aspect-[16/10] w-full overflow-hidden cursor-zoom-in group"
        >
          <img
            src={photos[selectedIndex]}
            alt={`${title} - Photo ${selectedIndex + 1}`}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />

          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Photo {selectedIndex + 1} of {photos.length}
          </div>

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white p-2 rounded-lg transition"
            title="View Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black text-white p-2 rounded-full transition"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black text-white p-2 rounded-full transition"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 overflow-x-auto">
            {photos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  idx === selectedIndex
                    ? 'border-blue-600 ring-2 ring-blue-600/30'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 p-2.5 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/15 hover:bg-white/30 p-3 rounded-full"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/15 hover:bg-white/30 p-3 rounded-full"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          <img
            src={photos[selectedIndex]}
            alt={`${title} - Fullscreen ${selectedIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] object-contain rounded-lg"
          />
          <div className="absolute bottom-4 text-white/80 text-sm font-medium">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}