export default function Logo({ variant = 'light', size = 'md' }) {
  const isLight = variant === 'light';
  const iconSize = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Custom VIN24 Shield + Barcode Emblem */}
      <div
        className={`${iconSize} rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
        >
          <path
            d="M16 3L5 7.5V15.5C5 22.4 9.7 28.7 16 30.5C22.3 28.7 27 22.4 27 15.5V7.5L16 3Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M11 16L14.5 19.5L21.5 12.5"
            stroke="#60A5FA"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Wordmark */}
      <div className={`font-extrabold tracking-tight leading-none ${textSize}`}>
        <span className={isLight ? 'text-white' : 'text-slate-900'}>VIN</span>
        <span className="text-blue-500">24</span>
        <span
          className={`text-xs font-bold uppercase tracking-wider ml-1 px-1.5 py-0.5 rounded ${
            isLight
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          .pro
        </span>
      </div>
    </div>
  );
}