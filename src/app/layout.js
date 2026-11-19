import './globals.css';

export const metadata = {
  title: {
    default: 'VIN24.pro | Vehicle History, Auction & Condition Records',
    template: '%s | VIN24.pro',
  },
  description:
    'Search 17-digit Vehicle Identification Numbers (VIN) for verified vehicle specifications, auction condition records, odometer history, and inspection photos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}