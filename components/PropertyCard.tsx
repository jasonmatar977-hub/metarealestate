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
}

export default function PropertyCard({
  title,
  location,
  price,
  description,
  imageUrl,
}: PropertyCardProps) {
  return (
    <div className="glass-dark rounded-2xl overflow-hidden hover:scale-105 transition-transform shadow-lg">
      <div className="aspect-video bg-gradient-to-br from-gold/20 to-gold-dark/20 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">🏠</div>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-orbitron text-xl font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 mb-2 flex items-center">
          <span className="mr-2">📍</span>
          {location}
        </p>
        <p className="text-2xl font-bold text-gold-dark mb-3">{price}</p>
        <p className="text-gray-600 line-clamp-2">{description}</p>
      </div>
    </div>
  );
}

