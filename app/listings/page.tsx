"use client";

/**
 * Property Listings Page
 * Route: /listings
 * 
 * SECURITY: Protected route - requires authentication
 * All property data is treated as untrusted and rendered safely
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";

// Mock property data
// SECURITY NOTE: In production, this should come from a secure backend API
const MOCK_PROPERTIES = [
  {
    id: 1,
    title: "Modern Luxury Villa",
    location: "Beirut, Lebanon",
    price: "$850,000",
    description: "Stunning 4-bedroom villa with panoramic sea views, modern amenities, and private pool. Perfect for families seeking luxury living.",
  },
  {
    id: 2,
    title: "Downtown Apartment",
    location: "New York, USA",
    price: "$1,200,000",
    description: "Spacious 3-bedroom apartment in the heart of Manhattan. High-end finishes, concierge service, and walking distance to Central Park.",
  },
  {
    id: 3,
    title: "Beachfront Condo",
    location: "Barcelona, Spain",
    price: "€650,000",
    description: "Beautiful 2-bedroom condo with direct beach access. Modern design, fully furnished, and excellent investment opportunity.",
  },
  {
    id: 4,
    title: "Suburban Family Home",
    location: "Sydney, Australia",
    price: "A$950,000",
    description: "Charming 5-bedroom family home with large backyard, double garage, and close to schools. Ideal for growing families.",
  },
  {
    id: 5,
    title: "Penthouse Suite",
    location: "Dubai, UAE",
    price: "$2,500,000",
    description: "Luxurious 4-bedroom penthouse with private terrace, city views, and premium amenities. The epitome of modern living.",
  },
  {
    id: 6,
    title: "Historic Townhouse",
    location: "London, UK",
    price: "£1,800,000",
    description: "Elegant 3-bedroom townhouse in prime location. Period features combined with modern updates, perfect for professionals.",
  },
];

export default function ListingsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // SECURITY: Front-end route protection
    // TODO: Implement server-side protection with middleware/API routes
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-4 text-gold-dark">
            Property Listings
          </h1>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Discover your perfect property from our curated selection
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PROPERTIES.map((property) => (
              <PropertyCard
                key={property.id}
                title={property.title}
                location={property.location}
                price={property.price}
                description={property.description}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

