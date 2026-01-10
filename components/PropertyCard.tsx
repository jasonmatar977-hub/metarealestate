/**
 * Property Card Component
 * Displays a single property listing in a card format
 * 
 * SECURITY: All text content is rendered safely (no dangerouslySetInnerHTML)
 */

import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";

interface PropertyCardProps {
  listingId: number;
  listingUserId: string;
  title: string;
  location: string;
  price: string;
  description: string;
  imageUrl?: string;
  bedrooms?: number;
  bathrooms?: number;
  type?: string;
  area?: number;
  currentUserId?: string;
  currentUserRole?: string;
  onDelete?: (listingId: number, listingUserId: string) => void;
  onEdit?: (listingId: number, listingUserId: string) => void;
  isDeleting?: boolean;
  ownerName?: string | null;
  ownerVerified?: boolean;
  ownerRole?: string;
}

export default function PropertyCard({
  listingId,
  listingUserId,
  title,
  location,
  price,
  description,
  imageUrl,
  bedrooms,
  bathrooms,
  type,
  area,
  currentUserId,
  currentUserRole,
  onDelete,
  onEdit,
  isDeleting = false,
  ownerName,
  ownerVerified,
  ownerRole,
}: PropertyCardProps) {
  // Check if current user can edit/delete this listing (owner or admin)
  const canEditOrDelete = currentUserId && (
    currentUserId === listingUserId || currentUserRole === 'admin'
  );

  return (
    <div className="glass-dark rounded-2xl overflow-hidden hover:scale-105 transition-transform shadow-lg w-full relative">
      {/* Edit and Delete Buttons - Only visible if user is owner or admin */}
      {canEditOrDelete && (
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit(listingId, listingUserId);
              }}
              disabled={isDeleting}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Edit listing"
              title="Edit listing"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(listingId, listingUserId);
              }}
              disabled={isDeleting}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete listing"
              title="Delete listing"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Clickable Card Content - Navigate to detail page */}
      <Link href={`/listings/${listingId}`} className="block">
        {/* Image with Type Badge */}
        <div className="relative aspect-video bg-gradient-to-br from-gold/20 to-gold-dark/20 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover rounded-t-2xl"
              onError={(e) => {
                // Fallback to placeholder if image fails
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-placeholder')) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'fallback-placeholder w-full h-full flex flex-col items-center justify-center text-gray-400';
                  placeholder.innerHTML = '<div class="text-4xl mb-2">🏠</div><div class="text-xs font-semibold">No photo</div>';
                  parent.appendChild(placeholder);
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl sm:text-6xl mb-2">🏠</div>
              <div className="text-xs font-semibold">No photo</div>
            </div>
          )}
          {type && (
            <div className="absolute top-2 right-2 px-3 py-1 bg-gold/90 text-gray-900 text-xs font-bold rounded-full uppercase z-10">
              {type}
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6">
          <h3 className="font-orbitron text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">
            {title}
          </h3>
          {/* Owner Name with Verified Badge */}
          {ownerName && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-500">By</span>
              <span className="text-sm font-semibold text-gray-700">{ownerName}</span>
              <VerifiedBadge 
                isVerified={ownerVerified} 
                role={ownerRole}
                size="sm"
              />
            </div>
          )}
          <p className="text-gray-600 mb-2 flex items-center text-sm sm:text-base">
            <span className="mr-2">📍</span>
            <span className="break-words">{location}</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gold-dark mb-3">{price}</p>
          
          {/* Key Facts */}
          {(bedrooms || bathrooms || area) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {bedrooms && (
                <span className="px-2 py-1 bg-gold/20 text-gray-700 text-xs font-semibold rounded">
                  🛏️ {bedrooms} bed{bedrooms > 1 ? 's' : ''}
                </span>
              )}
              {bathrooms && (
                <span className="px-2 py-1 bg-gold/20 text-gray-700 text-xs font-semibold rounded">
                  🚿 {bathrooms} bath{bathrooms > 1 ? 's' : ''}
                </span>
              )}
              {area && (
                <span className="px-2 py-1 bg-gold/20 text-gray-700 text-xs font-semibold rounded">
                  📐 {area.toLocaleString()} sq ft
                </span>
              )}
            </div>
          )}
          
          <p className="text-gray-600 line-clamp-2 text-sm sm:text-base">{description}</p>
        </div>
      </Link>
    </div>
  );
}

