export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/vin/'],
      disallow: '/admin',
    },
    sitemap: 'https://www.vin24.pro/sitemap.xml',
  };
}