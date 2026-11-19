import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function sitemap() {
  const baseUrl = 'https://vin24.pro'; 

  let vehicles = [];
  try {
    const querySnapshot = await getDocs(collection(db, 'vehicles'));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        // If you don't have a timestamp in Firebase yet, this falls back to today
        updatedAt: data.createdAt?.toDate() || new Date(), 
      });
    });
  } catch (error) {
    console.error("Error fetching VINs for sitemap:", error);
  }

  const vinUrls = vehicles.map((vehicle) => ({
    url: `${baseUrl}/vin/${vehicle.id}`,
    lastModified: vehicle.updatedAt, // Tells Google exactly when this specific VIN was added
    changeFrequency: 'never', // Auction data is historical and doesn't change
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
    },
    ...vinUrls,
  ];
}