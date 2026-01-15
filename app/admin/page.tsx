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

  // TODO: remove after presentation
  // Seed demo data function
  const seedDemoData = async () => {
    if (!user || user.role !== 'admin') {
      toast.error("Only admins can seed demo data");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to seed demo data? This will create 10 journals, 5 listings, and 6 posts.");
    if (!confirmed) return;

    try {
      // 1. Create 10 area journals
      const journals = [
        {
          slug: "hamra",
          name: "Hamra",
          city: "beirut",
          status: "cooling" as const,
          demand: "Student area with moderate demand. Rental market active but prices stabilizing.",
          inventory_trend: "Increasing inventory as students graduate and move out.",
          price_flexibility: "Sellers more willing to negotiate, especially for older buildings.",
          rent_1br_min: 400,
          rent_1br_max: 700,
          rent_2br_min: 600,
          rent_2br_max: 1000,
          rent_3br_min: 900,
          rent_3br_max: 1500,
          sale_min: 1500,
          sale_max: 2800,
          driving_factors: ["Student population", "Proximity to AUB", "Affordable rents"],
          risks: ["Seasonal fluctuations", "Older building stock"],
          outlook: "sideways" as const,
          what_would_change: "New university programs or infrastructure improvements could boost demand.",
          methodology: "Based on rental listings, sales data, and local agent feedback over the past 6 months.",
          takeaway: "Good value for students and young professionals. Negotiation room available.",
          user_id: user.id,
        },
        {
          slug: "verdun",
          name: "Verdun",
          city: "beirut",
          status: "heating" as const,
          demand: "High demand from families seeking quality residential areas with good schools.",
          inventory_trend: "Limited inventory, especially for renovated units with parking.",
          price_flexibility: "Sellers holding firm on pricing due to strong demand.",
          rent_1br_min: 600,
          rent_1br_max: 900,
          rent_2br_min: 900,
          rent_2br_max: 1400,
          rent_3br_min: 1200,
          rent_3br_max: 2000,
          sale_min: 2200,
          sale_max: 3500,
          driving_factors: ["Family-friendly", "Quality schools", "Good infrastructure"],
          risks: ["Price appreciation may slow", "Limited new construction"],
          outlook: "up" as const,
          what_would_change: "New school openings or major infrastructure projects could further increase demand.",
          methodology: "Analysis of recent sales, rental trends, and family migration patterns.",
          takeaway: "Strong investment potential for family-oriented properties. Prices rising steadily.",
          user_id: user.id,
        },
        {
          slug: "saifi",
          name: "Saifi",
          city: "beirut",
          status: "stable" as const,
          demand: "Luxury market with consistent high-end demand from expats and investors.",
          inventory_trend: "Stable inventory with premium new developments entering market.",
          price_flexibility: "Limited negotiation on premium properties.",
          rent_1br_min: 1200,
          rent_1br_max: 2000,
          rent_2br_min: 1800,
          rent_2br_max: 3000,
          rent_3br_min: 2500,
          rent_3br_max: 4500,
          sale_min: 4000,
          sale_max: 7000,
          driving_factors: ["Luxury amenities", "Expat community", "Prime location"],
          risks: ["Economic volatility", "High entry barrier"],
          outlook: "sideways" as const,
          what_would_change: "Major economic shifts or expat community changes could impact demand.",
          methodology: "Tracking luxury property sales, expat rental patterns, and premium development launches.",
          takeaway: "Premium market remains stable. Best for high-end investors and expats.",
          user_id: user.id,
        },
        {
          slug: "gemmayzeh",
          name: "Gemmayzeh",
          city: "beirut",
          status: "heating" as const,
          demand: "Trendy neighborhood attracting young professionals and creatives.",
          inventory_trend: "Tight inventory, especially for renovated traditional buildings.",
          price_flexibility: "Sellers firm on pricing due to high demand.",
          rent_1br_min: 500,
          rent_1br_max: 800,
          rent_2br_min: 800,
          rent_2br_max: 1200,
          rent_3br_min: 1100,
          rent_3br_max: 1800,
          sale_min: 1800,
          sale_max: 3200,
          driving_factors: ["Nightlife", "Cultural scene", "Historic charm"],
          risks: ["Gentrification concerns", "Limited parking"],
          outlook: "up" as const,
          what_would_change: "New cultural venues or infrastructure improvements could boost prices further.",
          methodology: "Monitoring rental trends, sales activity, and neighborhood development projects.",
          takeaway: "Hot market for young professionals. Prices rising, inventory tight.",
          user_id: user.id,
        },
        {
          slug: "mar-mikhael",
          name: "Mar Mikhael",
          city: "beirut",
          status: "heating" as const,
          demand: "Very high demand from young professionals and creatives. Inventory extremely tight.",
          inventory_trend: "Very limited inventory. New listings sell/rent quickly.",
          price_flexibility: "Minimal negotiation room. Sellers in strong position.",
          rent_1br_min: 550,
          rent_1br_max: 850,
          rent_2br_min: 850,
          rent_2br_max: 1300,
          rent_3br_min: 1200,
          rent_3br_max: 1900,
          sale_min: 2000,
          sale_max: 3500,
          driving_factors: ["Trendy restaurants", "Art galleries", "Young professional appeal"],
          risks: ["Overheating market", "Limited parking"],
          outlook: "up" as const,
          what_would_change: "Market saturation or infrastructure issues could slow growth.",
          methodology: "Tracking rapid sales, rental competition, and neighborhood popularity metrics.",
          takeaway: "Extremely competitive market. Properties move fast at premium prices.",
          user_id: user.id,
        },
        {
          slug: "achrafieh",
          name: "Achrafieh",
          city: "beirut",
          status: "heating" as const,
          demand: "High demand from expats, investors, and affluent locals.",
          inventory_trend: "Limited quality inventory. Renovated units in high demand.",
          price_flexibility: "Sellers holding firm, especially for premium properties.",
          rent_1br_min: 700,
          rent_1br_max: 1100,
          rent_2br_min: 1100,
          rent_2br_max: 1700,
          rent_3br_min: 1500,
          rent_3br_max: 2500,
          sale_min: 2500,
          sale_max: 4500,
          driving_factors: ["Upscale amenities", "Expat community", "Quality infrastructure"],
          risks: ["Price appreciation may slow", "Economic sensitivity"],
          outlook: "up" as const,
          what_would_change: "Economic stability or new premium developments could boost prices.",
          methodology: "Analysis of expat rental patterns, investment sales, and premium property trends.",
          takeaway: "Strong investment area. Premium properties command top prices.",
          user_id: user.id,
        },
        {
          slug: "downtown",
          name: "Downtown",
          city: "beirut",
          status: "stable" as const,
          demand: "Steady demand from businesses and high-end residents.",
          inventory_trend: "Stable inventory with occasional premium developments.",
          price_flexibility: "Moderate negotiation room on older properties.",
          rent_1br_min: 1000,
          rent_1br_max: 1800,
          rent_2br_min: 1600,
          rent_2br_max: 2800,
          rent_3br_min: 2200,
          rent_3br_max: 4000,
          sale_min: 3500,
          sale_max: 6000,
          driving_factors: ["Business district", "Prime location", "Premium developments"],
          risks: ["Economic sensitivity", "High maintenance costs"],
          outlook: "sideways" as const,
          what_would_change: "Major business relocations or economic shifts could impact demand.",
          methodology: "Tracking commercial and residential sales, rental stability, and business activity.",
          takeaway: "Premium location with stable pricing. Best for business-oriented investors.",
          user_id: user.id,
        },
        {
          slug: "badaro",
          name: "Badaro",
          city: "beirut",
          status: "heating" as const,
          demand: "Growing demand from families and professionals seeking value.",
          inventory_trend: "Increasing interest, inventory starting to tighten.",
          price_flexibility: "Some negotiation room, but decreasing as demand grows.",
          rent_1br_min: 450,
          rent_1br_max: 750,
          rent_2br_min: 700,
          rent_2br_max: 1100,
          rent_3br_min: 1000,
          rent_3br_max: 1600,
          sale_min: 1600,
          sale_max: 2800,
          driving_factors: ["Value proposition", "Family-friendly", "Upcoming development"],
          risks: ["Infrastructure needs", "Gentrification pace"],
          outlook: "up" as const,
          what_would_change: "Infrastructure improvements or new developments could accelerate growth.",
          methodology: "Monitoring sales growth, rental trends, and neighborhood development plans.",
          takeaway: "Emerging area with good value. Prices rising as area develops.",
          user_id: user.id,
        },
        {
          slug: "koraytem",
          name: "Koraytem",
          city: "beirut",
          status: "stable" as const,
          demand: "Moderate demand from families and professionals.",
          inventory_trend: "Stable inventory with occasional new listings.",
          price_flexibility: "Reasonable negotiation room available.",
          rent_1br_min: 500,
          rent_1br_max: 800,
          rent_2br_min: 800,
          rent_2br_max: 1200,
          rent_3br_min: 1100,
          rent_3br_max: 1700,
          sale_min: 1800,
          sale_max: 3000,
          driving_factors: ["Residential appeal", "Good location", "Reasonable prices"],
          risks: ["Limited new development", "Infrastructure aging"],
          outlook: "sideways" as const,
          what_would_change: "New developments or infrastructure upgrades could boost demand.",
          methodology: "Tracking sales and rental activity, neighborhood stability metrics.",
          takeaway: "Stable residential area with reasonable prices. Good for families.",
          user_id: user.id,
        },
        {
          slug: "ain-el-mreisse",
          name: "Ain El Mreisse",
          city: "beirut",
          status: "stable" as const,
          demand: "Steady demand from residents seeking coastal access.",
          inventory_trend: "Stable inventory with coastal properties in demand.",
          price_flexibility: "Moderate negotiation, especially for non-coastal units.",
          rent_1br_min: 600,
          rent_1br_max: 900,
          rent_2br_min: 900,
          rent_2br_max: 1400,
          rent_3br_min: 1300,
          rent_3br_max: 2100,
          sale_min: 2000,
          sale_max: 3500,
          driving_factors: ["Coastal location", "Residential appeal", "Stable market"],
          risks: ["Limited new development", "Coastal property premium"],
          outlook: "sideways" as const,
          what_would_change: "Coastal development projects or infrastructure improvements could impact prices.",
          methodology: "Monitoring coastal property sales, rental trends, and development activity.",
          takeaway: "Stable coastal area. Coastal properties command premium, inland more affordable.",
          user_id: user.id,
        },
      ];

      const { error: journalsError } = await supabase
        .from("area_journals")
        .insert(journals);

      if (journalsError) {
        console.error("[Seed] Error creating journals:", journalsError);
        toast.error(`Failed to create journals: ${journalsError.message}`);
        return;
      }

      // 2. Create 5 demo listings
      const listings = [
        {
          user_id: user.id,
          title: "Luxury 3BR Apartment in Achrafieh",
          description: "Beautifully renovated 3-bedroom apartment in prime Achrafieh location. Features modern kitchen, spacious living area, and balcony with city views. Perfect for families or professionals. 180 sqm, 2 bathrooms, parking included.",
          price: 450000,
          city: "Beirut",
          image_urls: [],
        },
        {
          user_id: user.id,
          title: "Modern 2BR in Mar Mikhael",
          description: "Trendy 2-bedroom apartment in the heart of Mar Mikhael. Walking distance to restaurants, cafes, and art galleries. Recently renovated with modern finishes. 120 sqm, 1 bathroom.",
          price: 320000,
          city: "Beirut",
          image_urls: [],
        },
        {
          user_id: user.id,
          title: "Family Home in Verdun",
          description: "Spacious 4-bedroom family home in Verdun. Quiet residential area with good schools nearby. Large living spaces, garden, and parking included. 250 sqm, 3 bathrooms.",
          price: 580000,
          city: "Beirut",
          image_urls: [],
        },
        {
          user_id: user.id,
          title: "Studio Apartment in Hamra",
          description: "Cozy studio apartment perfect for students or young professionals. Located near AUB, with easy access to public transport and amenities. 35 sqm, 1 bathroom.",
          price: 95000,
          city: "Beirut",
          image_urls: [],
        },
        {
          user_id: user.id,
          title: "Premium Penthouse in Downtown",
          description: "Luxury penthouse with stunning city and sea views. High-end finishes, premium amenities, and concierge service. Ideal for executives or investors. 300 sqm, 3 bedrooms, 3 bathrooms.",
          price: 1200000,
          city: "Beirut",
          image_urls: [],
        },
      ];

      const { error: listingsError } = await supabase
        .from("listings")
        .insert(listings);

      if (listingsError) {
        console.error("[Seed] Error creating listings:", listingsError);
        toast.error(`Failed to create listings: ${listingsError.message}`);
        return;
      }

      // 3. Create 6 professional posts
      const posts = [
        {
          user_id: user.id,
          content: "📊 Market Update: Beirut real estate shows strong resilience in Q4 2024. Premium areas like Achrafieh and Downtown maintain stable pricing, while emerging neighborhoods like Badaro show promising growth. Investment opportunities remain strong for verified buyers.",
        },
        {
          user_id: user.id,
          content: "💡 Investment Tip: When evaluating properties in Beirut, consider proximity to universities, business districts, and infrastructure projects. Areas near planned metro stations or new developments often see 15-25% appreciation over 3-5 years.",
        },
        {
          user_id: user.id,
          content: "🏙️ Beirut Real Estate Insight: The rental yield in prime areas averages 4-6% annually, making real estate an attractive investment compared to traditional savings. Properties in student areas like Hamra offer higher yields (6-8%) but require more management.",
        },
        {
          user_id: user.id,
          content: "📈 Pricing Trends: We're seeing a shift toward quality over quantity. Buyers are willing to pay premium for renovated units with modern amenities, parking, and good infrastructure. Unrenovated properties are taking longer to sell unless priced competitively.",
        },
        {
          user_id: user.id,
          content: "💰 Rental Yield Advice: For investors seeking rental income, focus on 1-2 bedroom units in areas with high demand (Mar Mikhael, Gemmayzeh, Hamra). These typically rent faster and offer better yields than larger family units in quieter areas.",
        },
        {
          user_id: user.id,
          content: "📋 Buyer Guide: Before purchasing in Beirut, verify property ownership, check for any liens or disputes, and ensure proper documentation. Work with verified agents and consider areas with good infrastructure and growth potential. Always inspect the property thoroughly.",
        },
      ];

      const { error: postsError } = await supabase
        .from("posts")
        .insert(posts);

      if (postsError) {
        console.error("[Seed] Error creating posts:", postsError);
        toast.error(`Failed to create posts: ${postsError.message}`);
        return;
      }

      toast.success("Demo data seeded successfully! Created 10 journals, 5 listings, and 6 posts.");
    } catch (error: any) {
      console.error("[Seed] Exception seeding demo data:", error);
      toast.error(`Failed to seed demo data: ${error?.message || 'Unknown error'}`);
    }
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

          {/* TODO: remove after presentation */}
          {/* Seed Demo Data Section */}
          <div className="mt-12 glass-dark rounded-2xl p-6 border-2 border-amber-300">
            <h2 className="font-orbitron text-xl font-bold text-gray-900 mb-4">
              Demo Data Seeder
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Create demo content for presentation: 10 journals, 5 listings, 6 posts
            </p>
            <button
              onClick={seedDemoData}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Seed Demo Data
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
