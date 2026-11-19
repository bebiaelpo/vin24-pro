import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const baseUrl = 'https://www.vin24.pro';

  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  try {
    const querySnapshot = await getDocs(collection(db, 'vehicles'));
    const vehicleRoutes = querySnapshot.docs.map((doc) => ({
      url: `${baseUrl}/vin/${doc.id.toUpperCase()}`,
      lastModified: doc.data().uploadDate ? new Date(doc.data().uploadDate) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...routes, ...vehicleRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes;
  }
}