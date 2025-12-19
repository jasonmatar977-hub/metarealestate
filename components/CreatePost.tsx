"use client";

/**
 * Create Post Component
 * Facebook/Instagram-style post creation UI
 * Only visible when user is authenticated
 * Posts are saved to Supabase
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface CreatePostProps {
  onPostCreated: () => void; // Callback to refresh feed
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    const name = user.displayName || user.name || user.username || user.email;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log("=== CREATING POST ===");
      console.log("User ID:", user.id);
      console.log("Content:", content.trim());

      // Get current session to ensure we have the user_id
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Not authenticated. Please log in again.");
      }

      if (!session?.user?.id) {
        console.error("No user ID in session");
        throw new Error("Not authenticated. Please log in again.");
      }

      const userId = session.user.id;
      console.log("Using user_id from session:", userId);

      let imageUrl: string | null = null;

      // Upload image if present
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('post-media')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error("Failed to upload image. Please try again.");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        console.log("Image uploaded:", imageUrl);
      }

      // Insert post into Supabase
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content: content.trim(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) {
        console.error("=== CREATE POST ERROR ===");
        console.error("Full error:", insertError);
        console.error("Error message:", insertError.message);
        console.error("Error details:", insertError.details);
        console.error("Error hint:", insertError.hint);
        console.error("Error code:", insertError.code);
        throw insertError;
      }

      console.log("Post created successfully:", data);

      // Reset form
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      
      // Refresh feed
      onPostCreated();
    } catch (err: any) {
      console.error('=== CREATE POST CATCH ERROR ===');
      console.error('Error object:', err);
      console.error('Error message:', err?.message);
      console.error('Error details:', err?.details);
      console.error('Error hint:', err?.hint);
      console.error('Error code:', err?.code);
      
      setError(err?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="glass-dark rounded-2xl p-4 mb-6">
      <div className="flex items-start space-x-3">
        {/* User Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0">
          {getInitials()}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none mb-3"
            maxLength={500}
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mb-3 rounded-xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-64 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          )}

          {/* Image Upload Button */}
          <div className="mb-3">
            <label className="inline-block px-4 py-2 bg-white border-2 border-gold text-gold font-semibold rounded-xl hover:bg-gold/10 transition-colors cursor-pointer">
              <span className="mr-2">📷</span>
              {imageFile ? 'Change Image' : 'Add Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Character Count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{content.length}/500</span>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
