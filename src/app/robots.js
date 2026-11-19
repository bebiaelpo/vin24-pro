export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin', // Keep Google out of your login page
    },
    sitemap: 'https://vin24.pro/sitemap.xml',
  }
}