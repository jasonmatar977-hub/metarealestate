"use client";

/**
 * Listing Gallery Component
 * Displays listing images with thumbnail grid and fullscreen modal
 * Supports next/prev navigation and ESC key to close
 */

import { useState, useEffect } from "react";

interface ListingGalleryProps {
  images: string[];
  title: string;
}

export default function ListingGallery({ images, title }: ListingGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isFullscreen = selectedIndex !== null;

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isFullscreen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    };

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleArrowKeys);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleArrowKeys);
    };
  }, [isFullscreen, selectedIndex, images.length]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-video bg-gradient-to-br from-gold/20 to-gold-dark/20 rounded-2xl flex flex-col items-center justify-center text-gray-400">
        <div className="text-4xl sm:text-6xl mb-2">🏠</div>
        <div className="text-sm font-semibold">No photos</div>
      </div>
    );
  }

  const openModal = (index: number) => {
    setSelectedIndex(index);
  };

  const closeModal = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="space-y-4">
        {/* Main Preview (first image) */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer group" onClick={() => openModal(0)}>
          <img
            src={images[0]}
            alt={`${title} - Main view`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {images.length > 1 && (
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-full">
                {images.length} photos - Click to view
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail Grid (if more than 1 image) */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((image, index) => (
              <button
                key={index + 1}
                onClick={() => openModal(index + 1)}
                className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <img
                  src={image}
                  alt={`${title} - View ${index + 2}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {index === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{images.length - 5}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
            aria-label="Close gallery"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
              aria-label="Previous image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
              aria-label="Next image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-semibold z-10">
              {selectedIndex + 1} / {images.length}
            </div>
          )}

          {/* Main Image */}
          <div
            className="max-w-7xl max-h-full w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedIndex]}
              alt={`${title} - Image ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
