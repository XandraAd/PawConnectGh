import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, account, storage } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { ArrowLeft, User, Dog, Package, LogOut, Camera, X, Save, Crown } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      // Get user profile
      const profileResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [
          Query.equal("userId", currentUser.$id),
          Query.limit(1)
        ]
      );

      if (profileResponse.documents.length > 0) {
        const userProfile = profileResponse.documents[0];
        setProfile(userProfile);
        setFormData({
          fullName: userProfile.fullName || currentUser.name || "",
          username: userProfile.username || currentUser.email?.split('@')[0] || "",
          bio: userProfile.bio || "",
          location: userProfile.location || "",
          avatarUrl: userProfile.avatarUrl || "",
        });
        if (userProfile.avatarUrl) {
          setAvatarPreview(userProfile.avatarUrl);
        }
        // Check if user is admin
        setIsAdmin(userProfile.isAdmin || false);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (file) => {
    try {
      const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID || "images";
      const response = await storage.createFile(
        bucketId,
        ID.unique(),
        file
      );
      return storage.getFileView(bucketId, response.$id);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;
      
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const profileData = {
        fullName: formData.fullName,
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        avatarUrl: avatarUrl,
      };

      if (profile) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          profile.$id,
          profileData
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          ID.unique(),
          {
            userId: user.$id,
            ...profileData,
          }
        );
      }

      toast.success("Profile updated successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-jakarta font-bold text-lg text-foreground">Settings</h1>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-jakarta font-medium transition-colors ${
              activeTab === "profile" 
                ? "bg-primary text-white" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => navigate("/my-dogs")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-jakarta font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Dog className="w-4 h-4" />
            My Dogs
          </button>
          <button
            onClick={() => navigate("/my-listings")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-jakarta font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Package className="w-4 h-4" />
            My Listings
          </button>
        </div>

        {/* Profile Settings */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-3xl font-jakarta font-bold">
                      {formData.fullName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors border-2 border-card">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs font-jakarta text-muted-foreground mt-2">
                Tap the camera icon to change photo
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows="3"
                placeholder="Tell us about yourself..."
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-jakarta font-semibold text-foreground mb-1.5">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Accra, Ghana"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-primary text-white rounded-xl py-3.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs font-jakarta">
                <span className="px-2 bg-background text-muted-foreground">Danger Zone</span>
              </div>
            </div>

            {/* Admin Panel Button - Only visible to admins */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full bg-yellow-500/10 text-yellow-600 rounded-xl py-3.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-yellow-500/20"
              >
                <Crown className="w-4 h-4" />
                Admin Panel
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 text-red-500 rounded-xl py-3.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}