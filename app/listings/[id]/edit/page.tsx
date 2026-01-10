"use client";

/**
 * Edit Listing Page
 * Route: /listings/[id]/edit
 * Allows listing owner or admin to edit a property listing
 * 
 * SECURITY: Protected route - requires authentication
 * Frontend check for owner OR role='admin' (UX only)
 * Real security enforced by RLS policies
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface ListingData {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  image_urls: string[] | null;
}

export default function EditListingPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    description: "",
    price: "",
    city: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load listing data
  useEffect(() => {
    if (!listingId || !isAuthenticated || !user) return;

    const loadListing = async () => {
      setIsLoadingListing(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('id, user_id, title, description, price, city, image_urls')
          .eq('id', listingId)
          .single();

        if (error) {
          console.error("[EditListing] Error loading listing:", error);
          if (error.code === 'PGRST116') {
            // Not found
            toast.error("Listing not found");
            router.push("/listings");
          } else {
            toast.error("Failed to load listing");
            router.push("/listings");
          }
          return;
        }

        if (!data) {
          toast.error("Listing not found");
          router.push("/listings");
          return;
        }

        // Security check: Only owner or admin can edit
        const isOwner = user.id === data.user_id;
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
          toast.error("Not allowed");
          router.push("/listings");
          return;
        }

        setListing(data);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: data.price ? data.price.toString() : "",
          city: data.city || "",
        });
        setExistingImages(data.image_urls || []);
      } catch (error: any) {
        console.error("[EditListing] Exception loading listing:", error);
        toast.error("Failed to load listing");
        router.push("/listings");
      } finally {
        setIsLoadingListing(false);
      }
    };

    loadListing();
  }, [listingId, isAuthenticated, user, router]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loadingSession && !isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, loadingSession, router, hasRedirected]);

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

    // Calculate total images (existing + new)
    const totalImages = existingImages.length + selectedImages.length;
    const remainingSlots = 5 - totalImages;
    
    if (files.length > remainingSlots) {
      toast.error(`You can only upload up to 5 images total. ${remainingSlots} slot(s) remaining.`);
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

  // Remove existing image
  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove selected (new) image
  const removeSelectedImage = (index: number) => {
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

    if (!user || !listing) {
      toast.error("You must be logged in to edit a listing");
      return;
    }

    // Security check: Only owner or admin can edit
    const isOwner = user.id === listing.user_id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      toast.error("Not allowed");
      router.push("/listings");
      return;
    }

    // Confirm save changes
    const confirmed = window.confirm("Are you sure you want to save these changes?");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setUploadingImages(selectedImages.length > 0);

    try {
      let imageUrls: string[] = [...existingImages];

      // Step 1: Upload new images (if any)
      if (selectedImages.length > 0) {
        const uploadedUrls: string[] = [];
        const baseTimestamp = Date.now();

        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          
          // Create unique storage path
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
          const timestamp = baseTimestamp + i;
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
            console.error("[EditListing] Error uploading image:", uploadError);
            toast.error(`Failed to upload ${file.name}. Please try again.`);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('listing-images')
            .getPublicUrl(storagePath);

          if (!urlData?.publicUrl) {
            console.error("[EditListing] Failed to get public URL for:", storagePath);
            toast.error(`Failed to get URL for ${file.name}. Please try again.`);
            return;
          }

          uploadedUrls.push(urlData.publicUrl);
        }

        // Combine existing and new images
        imageUrls = [...existingImages, ...uploadedUrls];
      }

      // Step 2: Update listing in database
      // RLS will enforce that only owner or admin can update
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          city: formData.city.trim() || null,
          image_urls: imageUrls,
        })
        .eq('id', listingId);

      if (updateError) {
        console.error("[EditListing] Error updating listing:", updateError);
        
        // Check if it's an RLS policy violation
        if (updateError.code === '42501' || updateError.message?.includes('permission denied') || updateError.message?.includes('policy')) {
          toast.error("You don't have permission to edit this listing");
        } else {
          toast.error(updateError.message || "Failed to update listing. Please try again.");
        }
        return;
      }

      // Success
      toast.success("Listing updated");
      router.push("/listings");
    } catch (error: any) {
      console.error("[EditListing] Exception updating listing:", error);
      toast.error(error?.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (isLoading || loadingSession || isLoadingListing) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !listing) {
    return null; // Will redirect via useEffect
  }

  const totalImages = existingImages.length + selectedImages.length;

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-center mb-6 text-gold-dark">
            Edit Listing
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Update your property listing
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
                  Images (up to 5 total)
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  id="images"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={totalImages >= 5 || isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Each image must be less than 5MB. {totalImages}/5 selected.
                </p>

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Existing Images:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-32 object-cover rounded-xl border-2 border-gold/40"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
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
                  </div>
                )}

                {/* New Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">New Images:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-xl border-2 border-gold/40"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedImage(index)}
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
                    ? "Saving..." 
                    : "Save Changes"}
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
