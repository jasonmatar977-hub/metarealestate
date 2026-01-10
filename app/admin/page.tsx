"use client";

/**
 * Admin Dashboard Page
 * Route: /admin
 * Admin-only route for managing users (role, verification status)
 * 
 * SECURITY: Protected route - requires authentication AND admin role
 * Frontend guard only - backend/RLS must also enforce admin checks
 * Uses RPC function: admin_update_user(target_user_id, new_role, new_is_verified)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isValidUrl } from "@/lib/utils";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  display_name: string | null;
  email?: string | null; // May not be in profiles, but included for type safety
  role: string | null;
  is_verified: boolean | null;
  created_at: string;
  avatar_url?: string | null;
}

export default function AdminPage() {
  const { isAuthenticated, isLoading, loadingSession, user } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [localChanges, setLocalChanges] = useState<Record<string, { role: string; is_verified: boolean }>>({});

  useEffect(() => {
    // Wait for initial session check to complete
    if (loadingSession || isLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      if (!hasRedirected) {
        setHasRedirected(true);
        router.push("/login");
      }
      return;
    }

    // Redirect if not admin (with toast error)
    if (user.role !== "admin") {
      if (!hasRedirected) {
        setHasRedirected(true);
        toast.error("Admins only");
        setTimeout(() => {
          router.push("/feed");
        }, 100);
      }
      return;
    }

    // User is authenticated and is admin - allow access and load users
    if (isAuthenticated && user.role === "admin") {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, loadingSession, user, router, hasRedirected]);

  // Load users from profiles table
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);

    try {
      // Fetch all profiles with required fields
      // Note: email is in auth.users table, not profiles. 
      // Using display_name instead of full_name (profiles uses display_name).
      // If email is needed in UI, consider creating a view or RPC function that joins with auth.users
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name, role, is_verified, created_at, avatar_url')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("[Admin] Error loading users:", fetchError);
        setError(fetchError.message || "Failed to load users");
        toast.error("Failed to load users");
        return;
      }

      // Transform to match UserProfile interface
      // Note: email is not in profiles table - it's in auth.users
      // We use display_name instead of full_name (profiles uses display_name)
      // If email is needed, it would require a view or RPC function to join with auth.users
      const transformedUsers: UserProfile[] = (data || []).map((profile) => ({
        id: profile.id,
        display_name: profile.display_name,
        email: null, // Email not directly available from profiles (would need join with auth.users via view/RPC)
        role: profile.role || 'user',
        is_verified: profile.is_verified ?? false,
        created_at: profile.created_at,
        avatar_url: profile.avatar_url,
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      console.error("[Admin] Exception loading users:", error);
      setError(error?.message || "Failed to load users");
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Handle role change
  const handleRoleChange = (userId: string, newRole: string) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    setLocalChanges((prev) => ({
      ...prev,
      [userId]: {
        role: newRole,
        is_verified: localChanges[userId]?.is_verified ?? currentUser.is_verified ?? false,
      },
    }));

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  // Handle verified toggle
  const handleVerifiedToggle = (userId: string, newValue: boolean) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    setLocalChanges((prev) => ({
      ...prev,
      [userId]: {
        role: localChanges[userId]?.role ?? currentUser.role ?? 'user',
        is_verified: newValue,
      },
    }));

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_verified: newValue } : u))
    );
  };

  // Save user changes
  const handleSaveUser = async (userId: string) => {
    const changes = localChanges[userId];
    if (!changes) {
      toast.error("No changes to save");
      return;
    }

    setEditingUser(userId);

    try {
      // Call RPC function to update user
      const { data, error: rpcError } = await supabase.rpc('admin_update_user', {
        target_user_id: userId,
        new_role: changes.role,
        new_is_verified: changes.is_verified,
      });

      if (rpcError) {
        console.error("[Admin] Error updating user:", rpcError);
        
        // Revert optimistic update on error
        loadUsers();
        
        toast.error(rpcError.message || "Failed to update user");
        return;
      }

      // Success - clear local changes for this user
      setLocalChanges((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      toast.success("User updated successfully");
    } catch (error: any) {
      console.error("[Admin] Exception updating user:", error);
      
      // Revert optimistic update on error
      loadUsers();
      
      toast.error(error?.message || "Failed to update user");
    } finally {
      setEditingUser(null);
    }
  };

  // Filter users by search query (search by display_name)
  // Note: email is not in profiles table, so we search by display_name only
  const filteredUsers = users.filter((userProfile) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (userProfile.display_name || '').toLowerCase();
    const email = (userProfile.email || '').toLowerCase();
    return name.includes(query) || (email && email.includes(query));
  });

  // Get user initials
  const getInitials = (name: string | null, userId: string): string => {
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

  // Show loading state while checking access
  if (loadingSession || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </main>
    );
  }

  // Show loading/redirect state if not authenticated or not admin (redirecting)
  if (!isAuthenticated || !user || user.role !== "admin" || hasRedirected) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </main>
    );
  }

  // Render admin dashboard (user is authenticated and is admin)
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-gold-dark mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage users, roles, and verification status</p>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={loadUsers}
                className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Users Table/Cards */}
          {isLoadingUsers ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 glass-dark rounded-2xl">
              <p className="text-gray-600">
                {searchQuery ? "No users found matching your search." : "No users found."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userProfile) => {
                const hasChanges = !!localChanges[userProfile.id];
                const isSaving = editingUser === userProfile.id;
                const currentRole = localChanges[userProfile.id]?.role ?? userProfile.role ?? 'user';
                const currentVerified = localChanges[userProfile.id]?.is_verified ?? userProfile.is_verified ?? false;
                const initials = getInitials(userProfile.display_name, userProfile.id);

                return (
                  <div
                    key={userProfile.id}
                    className={`glass-dark rounded-2xl p-6 ${
                      hasChanges ? 'ring-2 ring-gold/50' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {userProfile.avatar_url && isValidUrl(userProfile.avatar_url) ? (
                          <img
                            src={userProfile.avatar_url}
                            alt={userProfile.display_name || "User"}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gold/30"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm ring-2 ring-gold/30';
                                fallback.textContent = initials;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-sm ring-2 ring-gold/30">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                          {userProfile.display_name || "No name"}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          ID: {userProfile.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined {new Date(userProfile.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Role Dropdown */}
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={currentRole}
                          onChange={(e) => handleRoleChange(userProfile.id, e.target.value)}
                          disabled={isSaving}
                          className="w-full sm:w-32 px-3 py-2 rounded-lg border-2 border-gold/40 focus:border-gold focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="user">user</option>
                          <option value="verified">verified</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>

                      {/* Verified Toggle */}
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Verified
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentVerified}
                            onChange={(e) => handleVerifiedToggle(userProfile.id, e.target.checked)}
                            disabled={isSaving}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                        </label>
                      </div>

                      {/* Save Button */}
                      <div className="w-full sm:w-auto flex-shrink-0">
                        <button
                          onClick={() => handleSaveUser(userProfile.id)}
                          disabled={!hasChanges || isSaving}
                          className={`w-full sm:w-auto px-6 py-2 rounded-xl font-bold transition-all ${
                            hasChanges && !isSaving
                              ? 'bg-gradient-to-r from-gold to-gold-light text-gray-900 hover:shadow-lg'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              Saving...
                            </span>
                          ) : hasChanges ? (
                            "Save"
                          ) : (
                            "No changes"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Results Count */}
          {!isLoadingUsers && filteredUsers.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
