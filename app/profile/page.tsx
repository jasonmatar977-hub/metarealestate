"use client";

/**
 * Profile Page
 * Route: /profile
 * Instagram-like profile view showing user information
 * 
 * SECURITY: Protected route - requires authentication
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import { isValidUrl } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import FollowersFollowingModal from "@/components/FollowersFollowingModal";
import VerifiedBadge from "@/components/VerifiedBadge";

// Clickable button component for Followers/Following counts
function FollowersFollowingButton({
  count,
  label,
  profileId,
  isOwnProfile,
  tab,
}: {
  count: number;
  label: string;
  profileId: string;
  isOwnProfile: boolean;
  tab: "followers" | "following";
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="text-2xl font-bold text-gold-dark">{count}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
      <FollowersFollowingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profileId={profileId}
        isOwnProfile={isOwnProfile}
        initialTab={tab}
      />
    </>
  );
}

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  phone_public: boolean;
  created_at: string;
  is_verified?: boolean;
  role?: string;
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, loadingSession, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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
          .select('id, display_name, bio, avatar_url, location, phone, website, phone_public, created_at, is_verified, role')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }

        if (data) {
          setProfile(data);
        } else {
          // Profile doesn't exist, create it
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              display_name: user.displayName || user.name || user.email?.split('@')[0] || 'User',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else {
            setProfile(newProfile);
          }
        }
      } catch (error) {
        console.error('Error in loadProfile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      loadProfile();
      loadUserPosts();
      loadCounts();
    }
  }, [isAuthenticated, user]);

  const loadUserPosts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, created_at, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error loading user posts:', error);
      } else {
        setUserPosts(data || []);
      }
    } catch (error) {
      console.error('Error in loadUserPosts:', error);
    }
  };

  const loadCounts = async () => {
    if (!user) return;
    try {
      // Posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setPostsCount(postsCount || 0);

      // Followers count (users who follow this user)
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      setFollowersCount(followersCount || 0);

      // Following count
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);
      setFollowingCount(followingCount || 0);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getInitials = (name: string | null | undefined, userId: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase() || 'U';
  };

  // Timeout fallback for loading state
  useEffect(() => {
    if (authLoading || isLoading) {
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, isLoading]);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
          <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const displayName = profile?.display_name || user?.displayName || user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="glass-dark rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-3xl sm:text-4xl flex-shrink-0">
                {profile?.avatar_url && isValidUrl(profile.avatar_url) ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.textContent = initials;
                      }
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <h1 className="font-orbitron text-2xl sm:text-3xl font-bold text-gray-900">
                    {displayName}
                  </h1>
                  <VerifiedBadge 
                    isVerified={profile?.is_verified} 
                    role={profile?.role}
                    size="md"
                  />
                </div>
                {profile?.bio && (
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-gray-600">
                  {profile?.location && (
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {/* Phone: Always show to owner (this is own profile) */}
                  {profile?.phone && (
                    <div className="flex items-center gap-1">
                      <span>📞</span>
                      <span>{profile.phone}</span>
                      {!profile.phone_public && (
                        <span className="text-xs text-gray-400 italic ml-1">
                          (Hidden from others)
                        </span>
                      )}
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-center gap-1">
                      <span>🌐</span>
                      <a
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:text-gold-dark"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <Link
                href="/profile/edit"
                className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-dark rounded-2xl p-6 mb-6">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-gold-dark">{postsCount}</div>
                <div className="text-sm text-gray-600">Posts</div>
              </div>
              {user && (
                <>
                  <FollowersFollowingButton
                    count={followersCount}
                    label={t("profile.followers") || "Followers"}
                    profileId={user.id}
                    isOwnProfile={true}
                    tab="followers"
                  />
                  <FollowersFollowingButton
                    count={followingCount}
                    label={t("profile.following") || "Following"}
                    profileId={user.id}
                    isOwnProfile={true}
                    tab="following"
                  />
                </>
              )}
            </div>
          </div>

          {/* User's Posts Grid */}
          <div className="mb-6">
            <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">Posts</h2>
            {userPosts.length === 0 ? (
              <div className="glass-dark rounded-2xl p-12 text-center">
                <p className="text-gray-600">No posts yet. Start sharing!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    postId={post.id}
                    userId={post.user_id}
                    username={displayName}
                    avatar={getInitials(displayName, user?.id || '')}
                    timestamp={formatTimestamp(post.created_at)}
                    content={post.content}
                    imageUrl={post.image_url || undefined}
                    likes={0}
                    userLiked={false}
                    comments={0}
                    onLikeToggle={() => {}}
                    onPostDeleted={async () => {
                      // Reload profile posts after deletion
                      if (user) {
                        const { data } = await supabase
                          .from('posts')
                          .select('*')
                          .eq('user_id', user.id)
                          .order('created_at', { ascending: false });
                        if (data) {
                          setUserPosts(data);
                          setPostsCount(data.length);
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="glass-dark rounded-2xl p-6">
            <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <span className="font-semibold">Email:</span> {user?.email}
              </div>
              <div>
                <span className="font-semibold">Member since:</span>{' '}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Recently'}
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}


