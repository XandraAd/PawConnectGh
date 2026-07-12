import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTIONS, account, storage } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { Settings, Plus, Grid3X3, Bookmark, Award, Camera, X, Edit2, Save, Crown, Heart, MessageCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import moment from "moment";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("posts");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    isBreeder: false,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      let userProfile = null;
      try {
        const profileResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          [Query.equal("userId", currentUser.$id), Query.limit(1)]
        );
        if (profileResponse.documents.length > 0) {
          userProfile = profileResponse.documents[0];
          setProfile(userProfile);
          setEditForm({
            fullName: userProfile.fullName || currentUser.name || "",
            username: userProfile.username || currentUser.email?.split('@')[0] || "",
            bio: userProfile.bio || "",
            location: userProfile.location || "",
            isBreeder: userProfile.isBreeder || false,
          });
          setAvatarPreview(userProfile.avatarUrl || null);
        } else {
          const newProfile = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            ID.unique(),
            {
              userId: currentUser.$id,
              username: currentUser.name || currentUser.email?.split('@')[0] || "user",
              fullName: currentUser.name || "User",
              avatarUrl: "",
              bio: "",
              location: "Ghana",
              isBreeder: false,
              isFeatured: false,
            }
          );
          setProfile(newProfile);
          setEditForm({
            fullName: newProfile.fullName || currentUser.name || "",
            username: newProfile.username || "",
            bio: newProfile.bio || "",
            location: newProfile.location || "",
            isBreeder: newProfile.isBreeder || false,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }

      const dogsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [Query.equal("ownerId", currentUser.$id), Query.limit(50)]
      );
      setDogs(dogsResponse.documents);

      const postsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        [Query.equal("userId", currentUser.$id), Query.orderDesc("$createdAt"), Query.limit(50)]
      );
      setPosts(postsResponse.documents);

      setFollowers(0);
      setFollowing(0);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
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
      const response = await storage.createFile(bucketId, ID.unique(), file);
      return storage.getFileView(bucketId, response.$id);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile?.avatarUrl || "";
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const profileData = {
        fullName: editForm.fullName,
        username: editForm.username,
        bio: editForm.bio,
        location: editForm.location,
        avatarUrl: avatarUrl,
        isBreeder: editForm.isBreeder,
      };

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profile.$id, profileData);
      setProfile((prev) => ({ ...prev, ...profileData }));
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDog = () => navigate("/add-dog");
  const handleSettings = () => navigate("/settings");
  const toggleEdit = () => {
    if (isEditing) {
      setEditForm({
        fullName: profile?.fullName || user?.name || "",
        username: profile?.username || "",
        bio: profile?.bio || "",
        location: profile?.location || "",
        isBreeder: profile?.isBreeder || false,
      });
      setAvatarPreview(profile?.avatarUrl || null);
      setAvatarFile(null);
    }
    setIsEditing(!isEditing);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.fullName || profile?.username || user?.name || "User";
  const displayUsername = profile?.username || user?.email?.split('@')[0] || "user";
  const displayLocation = profile?.location || "Ghana";
  const displayBio = profile?.bio || "";
  const displayAvatar = profile?.avatarUrl || "";
  const isBreeder = profile?.isBreeder || false;
  const isFeatured = profile?.isFeatured || false;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="font-jakarta font-bold text-lg text-foreground">Profile</h1>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={toggleEdit}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform hover:bg-primary/10"
              >
                <Edit2 className="w-4 h-4 text-foreground" />
              </button>
            )}
            <button
              onClick={handleSettings}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform hover:bg-primary/10"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto">
        {/* Avatar & Info */}
        <div className="flex flex-col items-center pt-8 pb-4 px-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full ring-2 ring-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-4xl font-jakarta font-bold overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt={displayName} className="w-full h-full object-cover" />
              ) : displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                displayName?.[0]?.toUpperCase() || "?"
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors border-2 border-card shadow-md">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {isBreeder && !isEditing && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-jakarta font-medium">
                <Award className="w-3.5 h-3.5" />
                Breeder
              </div>
            )}
            {isFeatured && !isEditing && (
              <div className="bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full flex items-center gap-1.5 border border-yellow-500/30 text-xs font-jakarta font-medium">
                <Crown className="w-3.5 h-3.5" />
                Featured
              </div>
            )}
          </div>

          {isEditing ? (
            // Edit Mode
            <div className="w-full mt-5 space-y-4">
              <div>
                <label className="block text-xs font-jakarta font-semibold text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm font-jakarta text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-jakarta font-semibold text-muted-foreground mb-1">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm font-jakarta text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-jakarta font-semibold text-muted-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Accra, Ghana"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-jakarta font-semibold text-muted-foreground mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows="2"
                  placeholder="Tell us about yourself..."
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Breeder Toggle */}
              <div className="bg-muted rounded-xl p-3 border border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <label className="text-sm font-jakarta font-semibold text-foreground cursor-pointer">
                        I am a Breeder
                      </label>
                    </div>
                    <p className="text-[10px] font-jakarta text-muted-foreground mt-0.5">
                      Show your profile in the breeders directory
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, isBreeder: !prev.isBreeder }))}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      editForm.isBreeder ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                        editForm.isBreeder ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={toggleEdit}
                  className="flex-1 bg-muted text-foreground rounded-xl py-2.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-primary text-white rounded-xl py-2.5 font-jakarta font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // View Mode
            <>
              <h2 className="font-jakarta font-bold text-xl text-foreground mt-3">{displayName}</h2>
              <p className="text-sm font-jakarta text-muted-foreground">@{displayUsername}</p>
              {displayLocation && (
                <p className="text-sm font-jakarta text-muted-foreground">{displayLocation}</p>
              )}
              {displayBio && <p className="text-sm font-jakarta text-foreground/80 text-center mt-2 px-8 leading-relaxed">{displayBio}</p>}
            </>
          )}
        </div>

        {/* Stats */}
        {!isEditing && (
          <div className="flex justify-center gap-10 pb-5 border-b border-border/50">
            {[
              { label: "Posts", value: posts.length },
              { label: "Followers", value: followers },
              { label: "Following", value: following },
            ].map((s) => (
              <button key={s.label} className="text-center active:scale-95 transition-transform">
                <p className="font-jakarta font-bold text-lg text-foreground">{s.value}</p>
                <p className="font-jakarta text-xs text-muted-foreground">{s.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* My Dogs */}
        {!isEditing && (
          <div className="px-4 mt-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-jakarta font-semibold text-sm text-foreground">My Dogs</h3>
              <button onClick={handleAddDog} className="text-xs font-jakarta text-primary font-medium">See All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={handleAddDog}
                className="shrink-0 w-20 h-24 bg-card border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform hover:border-primary/50"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-jakarta text-muted-foreground">Add Dog</span>
              </button>
              {dogs.map((dog) => (
                <div
                  key={dog.$id}
                  className="shrink-0 w-20 h-24 bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm cursor-pointer active:scale-95 transition-transform hover:shadow-md"
                  onClick={() => navigate(`/dog/${dog.$id}`)}
                >
                  <div className="h-14 bg-muted">
                    {dog.photoUrl ? (
                      <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🐕</div>
                    )}
                  </div>
                  <p className="text-[11px] font-jakarta font-medium text-center py-1.5 truncate px-1">{dog.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        {!isEditing && (
          <>
            <div className="flex border-b border-border">
              <button
                onClick={() => setTab("posts")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-jakarta font-semibold transition-colors ${
                  tab === "posts" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Posts
              </button>
              <button
                onClick={() => setTab("saved")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-jakarta font-semibold transition-colors ${
                  tab === "saved" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {tab === "posts" && posts.length === 0 && (
                <div className="col-span-3 text-center py-16">
                  <div className="text-6xl mb-3">📷</div>
                  <p className="font-jakarta font-semibold text-foreground">No posts yet</p>
                  <p className="font-jakarta text-sm text-muted-foreground mt-1">Share your first post!</p>
                </div>
              )}
              {tab === "posts" &&
                posts.map((p) => (
                  <div
                    key={p.$id}
                    className="aspect-square bg-muted cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                    onClick={() => navigate(`/post/${p.$id}`)}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.content || "Post"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card p-2">
                        <p className="text-xs font-jakarta text-muted-foreground text-center line-clamp-3">
                          {p.content || "Post"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              {tab === "saved" && (
                <div className="col-span-3 text-center py-16">
                  <div className="text-6xl mb-3">🔖</div>
                  <p className="font-jakarta font-semibold text-foreground">No saved posts</p>
                  <p className="font-jakarta text-sm text-muted-foreground mt-1">Save posts you love!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}