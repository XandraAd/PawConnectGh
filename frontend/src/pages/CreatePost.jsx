import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ID } from "appwrite";
import { databases, storage, DATABASE_ID, COLLECTIONS, IMAGES_BUCKET_ID } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";
import { Camera, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const postTypes = ["Regular Post", "Looking for Mate", "Lost Dog Alert", "Found Dog"];
const regions = ["Greater Accra", "Ashanti", "Western", "Eastern", "Northern", "Volta"];

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [dogName, setDogName] = useState("");
  const [postType, setPostType] = useState("Regular Post");
  const [region, setRegion] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRegion, setShowRegion] = useState(false);
  const [error, setError] = useState("");

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file); // actual upload happens on submit
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    setError("");

    try {
      let imageUrl;

      // Upload photo to Appwrite Storage first, if one was selected
      if (photoFile) {
        const uploaded = await storage.createFile(IMAGES_BUCKET_ID, ID.unique(), photoFile);
        imageUrl = storage.getFileView(IMAGES_BUCKET_ID, uploaded.$id);
      }

      await databases.createDocument(DATABASE_ID, COLLECTIONS.POSTS, ID.unique(), {
        userId: user.$id,
        authorName: user.name,
        content,
        dogName: dogName || undefined,
        postType,
        location: region || undefined,
        imageUrl: imageUrl || undefined,
        likes: [],
        commentCount: 0,
      });

      navigate("/");
    } catch (err) {
      setError(err.message || "Could not create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground font-jakarta font-medium text-sm active:scale-95">
            Cancel
          </button>
          <h1 className="font-jakarta font-bold text-base">New Post</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-4 space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Photo Upload */}
        <div className="relative">
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full aspect-[4/3] object-cover" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-dashed border-border rounded-2xl py-12 cursor-pointer active:scale-[0.98] transition-transform">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="font-jakarta text-sm text-muted-foreground">Tap to add photo</span>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          )}
        </div>

        {/* Caption */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening with your paw friend? 🐾"
          rows={4}
          className="w-full bg-card rounded-2xl p-4 text-sm font-jakarta text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border/50"
        />

        {/* Dog Name */}
        <input
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
          placeholder="Tag your dog's name (optional)"
          className="w-full bg-card rounded-xl px-4 py-3 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border/50"
        />

        {/* Post Type Chips */}
        <div>
          <p className="font-jakarta font-medium text-xs text-muted-foreground mb-2">Post Type</p>
          <div className="flex flex-wrap gap-2">
            {postTypes.map((t) => (
              <button
                key={t}
                onClick={() => setPostType(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-jakarta font-medium transition-colors active:scale-95 ${
                  postType === t ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Region */}
        <div className="relative">
          <button
            onClick={() => setShowRegion(!showRegion)}
            className="flex items-center gap-2 bg-card rounded-xl px-4 py-3 border border-border/50 w-full"
          >
            <span className="text-sm font-jakarta flex-1 text-left">{region || "Select region (optional)"}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showRegion ? "rotate-180" : ""}`} />
          </button>
          {showRegion && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegion(r); setShowRegion(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-jakarta hover:bg-muted transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="w-full h-12 rounded-xl font-jakarta font-bold text-base bg-gradient-to-r from-primary to-red-500 hover:opacity-90"
        >
          {submitting ? "Sharing..." : "Share Post 🐾"}
        </Button>
      </div>
    </div>
  );
}
