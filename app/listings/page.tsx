"use client";

/**
 * Property Listings Page
 * Route: /listings
 * Enhanced listings with search, filters, and sorting
 * 
 * SECURITY: Protected route - requires authentication
 * All property data is treated as untrusted and rendered safely
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import Footer from "@/components/Footer";

// Enhanced property data structure
interface Property {
  id: number;
  title: string;
  location: string;
  price: number; // Numeric for sorting
  priceDisplay: string; // Formatted display
  description: string;
  bedrooms: number;
  bathrooms: number;
  type: 'house' | 'apartment' | 'condo' | 'villa' | 'townhouse';
  area: number; // sq ft
  imageUrl?: string;
}

// Mock property data with enhanced fields
const MOCK_PROPERTIES: Property[] = [
  {
    id: 1,
    title: "Modern Luxury Villa",
    location: "Beirut, Lebanon",
    price: 850000,
    priceDisplay: "$850,000",
    bedrooms: 4,
    bathrooms: 3,
    type: "villa",
    area: 3500,
    description: "Stunning 4-bedroom villa with panoramic sea views, modern amenities, and private pool. Perfect for families seeking luxury living.",
  },
  {
    id: 2,
    title: "Downtown Apartment",
    location: "New York, USA",
    price: 1200000,
    priceDisplay: "$1,200,000",
    bedrooms: 3,
    bathrooms: 2,
    type: "apartment",
    area: 1800,
    description: "Spacious 3-bedroom apartment in the heart of Manhattan. High-end finishes, concierge service, and walking distance to Central Park.",
  },
  {
    id: 3,
    title: "Beachfront Condo",
    location: "Barcelona, Spain",
    price: 650000,
    priceDisplay: "€650,000",
    bedrooms: 2,
    bathrooms: 2,
    type: "condo",
    area: 1200,
    description: "Beautiful 2-bedroom condo with direct beach access. Modern design, fully furnished, and excellent investment opportunity.",
  },
  {
    id: 4,
    title: "Suburban Family Home",
    location: "Sydney, Australia",
    price: 950000,
    priceDisplay: "A$950,000",
    bedrooms: 5,
    bathrooms: 3,
    type: "house",
    area: 2800,
    description: "Charming 5-bedroom family home with large backyard, double garage, and close to schools. Ideal for growing families.",
  },
  {
    id: 5,
    title: "Penthouse Suite",
    location: "Dubai, UAE",
    price: 2500000,
    priceDisplay: "$2,500,000",
    bedrooms: 4,
    bathrooms: 4,
    type: "apartment",
    area: 4500,
    description: "Luxurious 4-bedroom penthouse with private terrace, city views, and premium amenities. The epitome of modern living.",
  },
  {
    id: 6,
    title: "Historic Townhouse",
    location: "London, UK",
    price: 1800000,
    priceDisplay: "£1,800,000",
    bedrooms: 3,
    bathrooms: 2,
    type: "townhouse",
    area: 2000,
    description: "Elegant 3-bedroom townhouse in prime location. Period features combined with modern updates, perfect for professionals.",
  },
];

type SortOption = 'newest' | 'price-low' | 'price-high';
type PropertyType = 'all' | Property['type'];

export default function ListingsPage() {
  const { isAuthenticated, isLoading, loadingSession } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [bedrooms, setBedrooms] = useState<number | 'all'>('all');
  const [propertyType, setPropertyType] = useState<PropertyType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    // Do not redirect until initial session check completes
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = [...MOCK_PROPERTIES];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Price range filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Bedrooms filter
    if (bedrooms !== 'all') {
      filtered = filtered.filter((p) => p.bedrooms === bedrooms);
    }

    // Property type filter
    if (propertyType !== 'all') {
      filtered = filtered.filter((p) => p.type === propertyType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
        default:
          return b.id - a.id; // Assuming higher ID = newer
      }
    });

    return filtered;
  }, [searchQuery, priceRange, bedrooms, propertyType, sortBy]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view listings.</p>
          <a href="/login" className="text-gold hover:text-gold-dark font-semibold">
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className="font-orbitron text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-gold-dark px-4">
            {t('listings.title')}
          </h1>
          <p className="text-center text-gray-600 mb-8 sm:mb-12 text-base sm:text-lg px-4">
            {t('listings.subtitle')}
          </p>

          {/* Search and Filters */}
          <div className="glass-dark rounded-2xl p-4 sm:p-6 mb-8">
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city, area, or keyword..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms
                </label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="all">All</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="villa">Villa</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Found <span className="font-bold text-gold-dark">{filteredProperties.length}</span> properties
            </p>
          </div>

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No properties found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPriceRange([0, 5000000]);
                  setBedrooms('all');
                  setPropertyType('all');
                  setSortBy('newest');
                }}
                className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  title={property.title}
                  location={property.location}
                  price={property.priceDisplay}
                  description={property.description}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  type={property.type}
                  area={property.area}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
