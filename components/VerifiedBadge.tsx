"use client";

/**
 * Verified Badge Component
 * Displays a small "Verified" badge with check icon for verified users or admins
 */

interface VerifiedBadgeProps {
  isVerified?: boolean;
  role?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function VerifiedBadge({
  isVerified = false,
  role,
  className = "",
  size = "sm",
}: VerifiedBadgeProps) {
  // Show badge if verified or admin
  const showBadge = isVerified === true || role === 'admin';

  if (!showBadge) {
    return null;
  }

  const sizeClasses = size === "sm" 
    ? "text-xs px-1.5 py-0.5 gap-1"
    : "text-sm px-2 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-full ${sizeClasses} ${className}`}
      title="Verified account"
      aria-label="Verified account"
    >
      <svg
        className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span>Verified</span>
    </span>
  );
}
