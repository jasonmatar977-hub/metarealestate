"use client";

/**
 * Edit Profile Page
 * Route: /profile/edit
 * Allows users to update their profile information
 * 
 * SECURITY: Protected route - users can only edit their own profile
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileData {
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  phone: string;
  website: string;
  phone_public: boolean;
}

export default function EditProfilePage() {
  const { isAuthenticated, isLoading: authLoading, loadingSession, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ProfileData>({
    display_name: '',
    bio: '',
    avatar_url: '',
    location: '',
    phone: '',
    website: '',
    phone_public: false,
  });

  useEffect(() => {
    // Do not redirect until initial session check completes
    if (!loadingSession && !authLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, loadingSession, router, hasRedirected]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }

        if (data) {
          setFormData({
            display_name: data.display_name || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            location: data.location || '',
            phone: data.phone || '',
            website: data.website || '',
            phone_public: data.phone_public ?? false, // Default to false if null
          });
        } else {
          // Set defaults from user
          setFormData({
            display_name: user.displayName || user.name || user.email?.split('@')[0] || '',
            bio: '',
            avatar_url: '',
            location: '',
            phone: '',
            website: '',
            phone_public: false,
          });
        }
      } catch (error) {
        console.error('Error in loadProfile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Upsert profile (insert or update)
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: formData.display_name.trim() || null,
          bio: formData.bio.trim() || null,
          avatar_url: formData.avatar_url.trim() || null,
          location: formData.location.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          phone_public: formData.phone_public,
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        throw upsertError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-orbitron text-3xl font-bold text-gold-dark">Edit Profile</h1>
            <Link
              href="/profile"
              className="text-gray-600 hover:text-gold transition-colors"
            >
              Cancel
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="glass-dark rounded-2xl p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                <p className="text-green-600 text-sm">Profile updated successfully!</p>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                placeholder="Your name"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
            </div>

            {/* Avatar URL */}
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-semibold text-gray-700 mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                placeholder="City, Country"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                placeholder="+1 234 567 8900"
              />
              {/* Phone Privacy Toggle */}
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.phone_public}
                    onChange={(e) => setFormData({ ...formData, phone_public: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-gold/40 text-gold focus:ring-gold focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {t('profile.showPhonePublicly') || 'Show my phone number publicly'}
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.phone_public 
                  ? (t('profile.phoneVisible') || 'Your phone number will be visible to all users')
                  : (t('profile.phoneHidden') || 'Your phone number will be hidden from other users')}
              </p>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-semibold text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
                placeholder="https://example.com"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/profile"
                className="px-6 py-3 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold/10 transition-all text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}




