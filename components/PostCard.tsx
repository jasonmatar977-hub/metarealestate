/**
 * Post Card Component
 * Displays a single post in the news feed (Instagram/Facebook style)
 * 
 * SECURITY: All text content is rendered safely (no dangerouslySetInnerHTML)
 */

interface PostCardProps {
  username: string;
  avatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes?: number;
  comments?: number;
}

export default function PostCard({
  username,
  avatar,
  timestamp,
  content,
  imageUrl,
  likes = 0,
  comments = 0,
}: PostCardProps) {
  return (
    <div className="glass-dark rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 flex items-center space-x-3 border-b border-gold/20">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg">
          {avatar}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{username}</h3>
          <p className="text-sm text-gray-500">{timestamp}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{content}</p>
        {imageUrl && (
          <div className="rounded-xl overflow-hidden mb-4">
            <img
              src={imageUrl}
              alt="Post content"
              className="w-full h-auto"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center space-x-6 text-gray-600">
        <button className="flex items-center space-x-2 hover:text-gold transition-colors">
          <span>❤️</span>
          <span>{likes}</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-gold transition-colors">
          <span>💬</span>
          <span>{comments}</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-gold transition-colors">
          <span>📤</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

