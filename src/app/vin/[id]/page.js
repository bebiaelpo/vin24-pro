import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VehicleClientView from '@/components/VehicleClientView';

export const dynamic = 'force-dynamic';

async function getVehicleData(vin) {
  try {
    const docRef = doc(db, 'vehicles', vin.toUpperCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const vin = decodeURIComponent(resolvedParams.id).trim().toUpperCase();
  const vehicle = await getVehicleData(vin);

  if (!vehicle) {
    return { title: `VIN ${vin} - Not Found | vin24.pro` };
  }

  const titleText = `VIN ${vehicle.vin} - ${vehicle.year} ${vehicle.make} ${vehicle.model} - Clean Title`;
  const descText = `History for VIN ${vehicle.vin}. View high-resolution photos, exact mileage, and definitive proof of a clean title. Not sold on Copart or IAAI.`;

  return {
    title: titleText,
    description: descText,
    openGraph: {
      title: titleText,
      description: descText,
      images: vehicle.photos?.auction?.[0] ? [vehicle.photos.auction[0]] : [],
    },
  };
}

export default async function VinPage({ params }) {
  const resolvedParams = await params;
  const vin = decodeURIComponent(resolvedParams.id).trim().toUpperCase();
  const vehicle = await getVehicleData(vin);

// SEO Schema Generation for Google
  const jsonLd = vehicle ? {
    "@context": "https://schema.org", 
    "@type": "Vehicle",
    "name": `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    "image": vehicle.photos?.auction?.[0] || "",
    "description": `Verified condition report and history for VIN ${vehicle.vin}`,
    "vehicleIdentificationNumber": vehicle.vin,
    "knownVehicleDamages": "None - Clean History",
    "mileageFromOdometer": { "@type": "QuantitativeValue", "value": vehicle.mileage, "unitCode": "SMI" },
    "productionDate": vehicle.year, 
    "model": vehicle.model,
    "brand": { "@type": "Brand", "name": vehicle.make },
    "itemCondition": "https://schema.org/UsedCondition",
    "offers": {
      "@type": "Offer",
      "url": `https://www.vin24.pro/vin/${vehicle.vin}`,
      "priceCurrency": "USD",
      "price": "0",
      "itemCondition": "https://schema.org/UsedCondition",
      "availability": "https://schema.org/OutOfStock"
    }
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {/* Pass the server-fetched data into the interactive Client UI */}
      <VehicleClientView vehicle={vehicle} searchedVin={vin} />
    </>
  );
}