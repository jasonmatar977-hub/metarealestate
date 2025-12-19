/**
 * Property Card Component
 * Displays a single property listing in a card format
 * 
 * SECURITY: All text content is rendered safely (no dangerouslySetInnerHTML)
 */

interface PropertyCardProps {
  title: string;
  location: string;
  price: string;
  description: string;
  imageUrl?: string;
  bedrooms?: number;
  bathrooms?: number;
  type?: string;
  area?: number;
}

export default function PropertyCard({
  title,
  location,
  price,
  description,
  imageUrl,
  bedrooms,
  bathrooms,
  type,
  area,
}: PropertyCardProps) {
  return (
    <div className="glass-dark rounded-2xl overflow-hidden hover:scale-105 transition-transform shadow-lg w-full">
      {/* Image with Type Badge */}
      <div className="relative aspect-video bg-gradient-to-br from-gold/20 to-gold-dark/20 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to emoji if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-emoji')) {
                const emoji = document.createElement('div');
                emoji.className = 'fallback-emoji text-6xl';
                emoji.textContent = '🏠';
                parent.appendChild(emoji);
              }
            }}
          />
        ) : (
          <div className="text-4xl sm:text-6xl">🏠</div>
        )}
        {type && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-gold/90 text-gray-900 text-xs font-bold rounded-full uppercase">
            {type}
          </div>
        )}
      </div>
      <div className="p-4 sm:p-6">
        <h3 className="font-orbitron text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">
          {title}
        </h3>
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
    </div>
  );
}

