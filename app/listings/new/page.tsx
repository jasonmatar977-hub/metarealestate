"use client";

/**
 * Create Listing Page
 * Route: /listings/new
 * Allows verified users or admins to create a new property listing
 * 
 * SECURITY: Protected route - requires authentication
 * Frontend check for is_verified OR role='admin' (UX only)
 * Real security enforced by RLS policies
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import toast from "react-hot-toast";

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  city: string;
}

export default function NewListingPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    description: "",
    price: "",
    city: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

  // Check if user is verified or admin
  const canCreateListing = user && (user.is_verified === true || user.role === 'admin');

  useEffect(() => {
    // Redirect to listings if user cannot create listings
    if (!loadingSession && !isLoading && isAuthenticated && !canCreateListing && !hasRedirected) {
      toast.error("You must be verified to create listings. Please verify your account first.");
      router.push("/listings");
    }
  }, [canCreateListing, isAuthenticated, isLoading, loadingSession, router, hasRedirected, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Limit to 5 images total
    const remainingSlots = 5 - selectedImages.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only upload up to 5 images. ${remainingSlots} slot(s) remaining.`);
      files.splice(remainingSlots);
    }

    // Validate each file
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        continue;
      }

      validFiles.push(file);
      
      // Create preview
      const preview = URL.createObjectURL(file);
      validPreviews.push(preview);
    }

    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...validPreviews]);
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Remove an image from selection
  const removeImage = (index: number) => {
    // Revoke object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a listing");
      return;
    }

    // Confirm user is verified/admin (existing check)
    if (!canCreateListing) {
      toast.error("You must be verified to create listings. Please verify your account first.");
      return;
    }

    setIsSubmitting(true);
    setUploadingImages(selectedImages.length > 0);

    try {
      let imageUrls: string[] = [];

      // Step 1: Upload images first (if any)
      if (selectedImages.length > 0) {
        const uploadedUrls: string[] = [];
        const baseTimestamp = Date.now();

        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          
          // Create unique storage path (unique per file to avoid collisions)
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50); // Limit filename length
          // Use base timestamp + index + microsecond offset for uniqueness
          const timestamp = baseTimestamp + i;
          // Generate random string if crypto.randomUUID is available, else use Math.random
          const randomId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID().slice(0, 8) 
            : Math.random().toString(36).substring(2, 10);
          const storagePath = `listings/${user.id}/${timestamp}-${randomId}-${safeFileName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type,
            });

          if (uploadError) {
            console.error("[NewListing] Error uploading image:", uploadError);
            toast.error(`Failed to upload ${file.name}. Please try again.`);
            // Stop and don't create listing if upload fails
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('listing-images')
            .getPublicUrl(storagePath);

          if (!urlData?.publicUrl) {
            console.error("[NewListing] Failed to get public URL for:", storagePath);
            toast.error(`Failed to get URL for ${file.name}. Please try again.`);
            return;
          }

          uploadedUrls.push(urlData.publicUrl);
        }

        imageUrls = uploadedUrls;
      }

      // Step 2: Insert listing into database with image URLs
      // RLS will enforce that only verified users or admins can insert
      const { data, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          city: formData.city.trim() || null,
          image_urls: imageUrls.length > 0 ? imageUrls : [],
        })
        .select()
        .single();

      if (error) {
        console.error("[NewListing] Error creating listing:", error);
        
        // Check if it's an RLS policy violation
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          toast.error("You must be verified to create listings. Please verify your account first.");
        } else {
          toast.error(error.message || "Failed to create listing. Please try again.");
        }
        return;
      }

      // Success
      toast.success("Listing created successfully!");
      router.push("/listings");
    } catch (error: any) {
      console.error("[NewListing] Exception creating listing:", error);
      toast.error(error?.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (isLoading || loadingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !canCreateListing) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-center mb-6 text-gold-dark">
            Create New Listing
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Add a new property listing to our marketplace
          </p>

          <div className="glass-dark rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Modern Luxury Villa"
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.title ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none`}
                  required
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the property..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g., 850000"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                />
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., Beirut, Lebanon"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                />
              </div>

              {/* Images */}
              <div>
                <label htmlFor="images" className="block text-sm font-semibold text-gray-700 mb-2">
                  Images (up to 5)
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  id="images"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={selectedImages.length >= 5 || isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Each image must be less than 5MB. {selectedImages.length}/5 selected.
                </p>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border-2 border-gold/40"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          disabled={isSubmitting}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remove image"
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
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push("/listings")}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImages}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImages 
                    ? "Uploading images..." 
                    : isSubmitting 
                    ? "Creating..." 
                    : "Create Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
