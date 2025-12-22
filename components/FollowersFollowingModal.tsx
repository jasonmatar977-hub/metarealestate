"use client";

/**
 * Followers/Following Management Modal
 * Shows lists of followers and following with management actions
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { isValidUrl } from "@/lib/utils";
import Link from "next/link";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FollowersFollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  isOwnProfile: boolean;
  initialTab?: "followers" | "following";
}

export default function FollowersFollowingModal({
  isOpen,
  onClose,
  profileId,
  isOwnProfile,
  initialTab = "followers",
}: FollowersFollowingModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // Load blocked users (users I blocked)
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadBlockedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id);

        if (error) {
          console.error("Error loading blocked users:", error);
          return;
        }

        const blockedIds = new Set((data || []).map((b) => b.blocked_id));
        setBlockedUserIds(blockedIds);
      } catch (error) {
        console.error("Error in loadBlockedUsers:", error);
      }
    };

    loadBlockedUsers();
  }, [user, isOpen]);

  // Load followers
  useEffect(() => {
    if (!isOpen || activeTab !== "followers") return;

    const loadFollowers = async () => {
      setIsLoading(true);
      try {
        // Get follows where following_id = profileId (users who follow this profile)
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileId);

        if (followsError) {
          console.error("Error loading followers:", followsError);
          setIsLoading(false);
          return;
        }

        if (!followsData || followsData.length === 0) {
          setFollowers([]);
          setIsLoading(false);
          return;
        }

        // Get profiles for follower IDs
        const followerIds = followsData.map((f) => f.follower_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", followerIds);

        if (profilesError) {
          console.error("Error loading follower profiles:", profilesError);
          setIsLoading(false);
          return;
        }

        // Filter out blocked users (users I blocked)
        const filteredProfiles = (profilesData || []).filter(
          (profile) => !blockedUserIds.has(profile.id)
        );

        setFollowers(filteredProfiles);
      } catch (error) {
        console.error("Error in loadFollowers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFollowers();
  }, [isOpen, activeTab, profileId, blockedUserIds]);

  // Load following
  useEffect(() => {
    if (!isOpen || activeTab !== "following") return;

    const loadFollowing = async () => {
      setIsLoading(true);
      try {
        // Get follows where follower_id = profileId (users this profile follows)
        const { data: followsData, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", profileId);

        if (followsError) {
          console.error("Error loading following:", followsError);
          setIsLoading(false);
          return;
        }

        if (!followsData || followsData.length === 0) {
          setFollowing([]);
          setIsLoading(false);
          return;
        }

        // Get profiles for following IDs
        const followingIds = followsData.map((f) => f.following_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", followingIds);

        if (profilesError) {
          console.error("Error loading following profiles:", profilesError);
          setIsLoading(false);
          return;
        }

        // Filter out blocked users (users I blocked)
        const filteredProfiles = (profilesData || []).filter(
          (profile) => !blockedUserIds.has(profile.id)
        );

        setFollowing(filteredProfiles);
      } catch (error) {
        console.error("Error in loadFollowing:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFollowing();
  }, [isOpen, activeTab, profileId, blockedUserIds]);

  const handleUnfollow = async (targetId: string) => {
    if (!user || !isOwnProfile) return;

    const confirmed = window.confirm(
      t("profile.confirmUnfollow") || "Are you sure you want to unfollow this user?"
    );

    if (!confirmed) return;

    try {
      // DELETE FROM follows where follower_id = auth.uid() AND following_id = targetId
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);

      if (error) {
        console.error("Error unfollowing:", error);
        alert(error.message || "Failed to unfollow. Please try again.");
        return;
      }

      // Remove from following list
      setFollowing((prev) => prev.filter((u) => u.id !== targetId));
    } catch (error) {
      console.error("Error in handleUnfollow:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleRemoveFollower = async (targetId: string) => {
    if (!user || !isOwnProfile) return;

    const confirmed = window.confirm(
      t("profile.confirmRemoveFollower") ||
        "Are you sure you want to remove this follower? This will block them."
    );

    if (!confirmed) return;

    try {
      // Step 1: INSERT INTO blocks (blocker_id=auth.uid(), blocked_id=targetId) ON CONFLICT DO NOTHING
      const { error: blockError } = await supabase
        .from("blocks")
        .insert({
          blocker_id: user.id,
          blocked_id: targetId,
        })
        .select()
        .single();

      // Ignore conflict errors (already blocked)
      if (blockError && blockError.code !== "23505") {
        console.error("Error blocking user:", blockError);
        // Continue anyway - try to delete follow
      }

      // Step 2: Attempt to DELETE FROM follows where follower_id = targetId AND following_id = auth.uid()
      // This might fail due to RLS (follower_id != auth.uid), but we try anyway
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", targetId)
        .eq("following_id", user.id);

      // Ignore RLS errors (expected if RLS doesn't allow this)
      if (deleteError && deleteError.code !== "42501") {
        console.warn("Could not delete follow (expected if RLS blocks it):", deleteError);
      }

      // Update blocked users set
      setBlockedUserIds((prev) => new Set(prev).add(targetId));

      // Remove from followers list
      setFollowers((prev) => prev.filter((u) => u.id !== targetId));
    } catch (error) {
      console.error("Error in handleRemoveFollower:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const getInitials = (name: string | null | undefined, userId: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase() || "U";
  };

  if (!isOpen) return null;

  const currentList = activeTab === "followers" ? followers : following;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-dark rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold/20">
          <h2 className="font-orbitron text-2xl font-bold text-gold-dark">
            {activeTab === "followers"
              ? t("profile.followers") || "Followers"
              : t("profile.following") || "Following"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gold/20">
          <button
            onClick={() => setActiveTab("followers")}
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === "followers"
                ? "text-gold border-b-2 border-gold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("profile.followers") || "Followers"}
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === "following"
                ? "text-gold border-b-2 border-gold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("profile.following") || "Following"}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">{t("common.loading") || "Loading..."}</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">
                {activeTab === "followers"
                  ? t("profile.noFollowers") || "No followers yet"
                  : t("profile.noFollowing") || "Not following anyone yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map((userProfile) => {
                const displayName = userProfile.display_name || "User";
                const initials = getInitials(userProfile.display_name, userProfile.id);

                return (
                  <div
                    key={userProfile.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gold/5 transition-colors"
                  >
                    {/* Avatar */}
                    <Link href={`/u/${userProfile.id}`} onClick={onClose}>
                      {userProfile.avatar_url && isValidUrl(userProfile.avatar_url) ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement("div");
                              fallback.className =
                                "w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm";
                              fallback.textContent = initials;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm">
                          {initials}
                        </div>
                      )}
                    </Link>

                    {/* Name */}
                    <Link
                      href={`/u/${userProfile.id}`}
                      onClick={onClose}
                      className="flex-1 min-w-0"
                    >
                      <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                    </Link>

                    {/* Actions (only for own profile) */}
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        {activeTab === "following" && (
                          <button
                            onClick={() => handleUnfollow(userProfile.id)}
                            className="px-4 py-2 bg-white border-2 border-gold text-gold font-semibold rounded-lg hover:bg-gold hover:text-gray-900 transition-all text-sm"
                          >
                            {t("profile.unfollow") || "Unfollow"}
                          </button>
                        )}
                        {activeTab === "followers" && (
                          <button
                            onClick={() => handleRemoveFollower(userProfile.id)}
                            className="px-4 py-2 bg-red-50 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-all text-sm"
                          >
                            {t("profile.removeFollower") || "Remove"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

