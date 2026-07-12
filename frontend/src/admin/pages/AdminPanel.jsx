import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { ArrowLeft, Crown, Users, Award, Search, X, Check } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    setLoading(true);
    try {
      // Get current user
      const user = await account.get();
      setCurrentUser(user);

      // Check if user is admin
      const profileResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [
          Query.equal("userId", user.$id),
          Query.limit(1)
        ]
      );

      console.log("Profile response for admin check:", profileResponse);

      if (profileResponse.documents.length === 0) {
        console.error("No profile found for user");
        toast.error("Profile not found. Please complete your profile first.");
        navigate("/profile");
        return;
      }

      const userProfile = profileResponse.documents[0];
      console.log("User profile:", userProfile);
      console.log("isAdmin value:", userProfile.isAdmin);

      if (!userProfile.isAdmin) {
        toast.error("Access denied. Admin only.");
        navigate("/profile");
        return;
      }

      setIsAdmin(true);

      // Fetch all profiles (users)
      const allProfiles = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );

      console.log("All profiles:", allProfiles.documents);

      // Get user details for each profile
      const usersWithDetails = await Promise.all(
        allProfiles.documents.map(async (profile) => {
          try {
            const userData = await account.get(profile.userId);
            return {
              ...profile,
              email: userData.email,
              name: userData.name,
            };
          } catch (error) {
            console.error(`Error fetching user data for ${profile.userId}:`, error);
            return {
              ...profile,
              email: "Unknown",
              name: "Unknown",
            };
          }
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error("Error loading admin panel:", error);
      toast.error("Failed to load admin panel");
      navigate("/profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleField = async (userId, field, currentValue) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      // Find the profile document for this user
      const profile = users.find(u => u.userId === userId);
      if (!profile) throw new Error("User not found");

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        profile.$id,
        { [field]: !currentValue }
      );

      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.userId === userId ? { ...u, [field]: !currentValue } : u
        )
      );

      toast.success(`${field} toggled successfully`);
    } catch (error) {
      console.error("Error toggling field:", error);
      toast.error("Failed to update user");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-jakarta text-muted-foreground">Access denied. You are not an admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-jakarta font-bold text-lg text-foreground">Admin Panel</h1>
          <div className="flex-1" />
          <Crown className="w-5 h-5 text-yellow-500" />
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-muted rounded-xl pl-10 pr-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.$id}
              className="bg-card rounded-2xl border border-border/50 p-4"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-jakarta font-bold text-primary">
                      {user.fullName?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-jakarta font-semibold text-sm text-foreground truncate">
                      {user.fullName || user.username || "User"}
                    </p>
                    {user.isAdmin && (
                      <span className="text-[8px] font-jakarta bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-jakarta text-muted-foreground">@{user.username}</p>
                  <p className="text-[10px] font-jakarta text-muted-foreground truncate">{user.email}</p>
                  <p className="text-[10px] font-jakarta text-muted-foreground">📍 {user.location || "Not set"}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  {/* Breeder Toggle */}
                  <button
                    onClick={() => toggleField(user.userId, "isBreeder", user.isBreeder)}
                    disabled={actionLoading[user.userId]}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isBreeder
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title="Toggle Breeder"
                  >
                    <Award className="w-4 h-4" />
                  </button>

                  {/* Featured Toggle */}
                  <button
                    onClick={() => toggleField(user.userId, "isFeatured", user.isFeatured)}
                    disabled={actionLoading[user.userId]}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isFeatured
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title="Toggle Featured"
                  >
                    <Crown className="w-4 h-4" />
                  </button>

                  {/* Admin Toggle - only for super admins? We'll allow it for now */}
                  <button
                    onClick={() => toggleField(user.userId, "isAdmin", user.isAdmin)}
                    disabled={actionLoading[user.userId] || user.userId === currentUser?.$id}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isAdmin
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title="Toggle Admin"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}