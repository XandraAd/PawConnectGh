import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, storage, account } from "@/lib/appwriteClient";
import { ID } from "appwrite";
import { Camera, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const categories = ["Puppies", "Adult Dogs", "Accessories", "Food & Treats", "Vet Services"];
const regions = ["Greater Accra", "Ashanti", "Western", "Eastern", "Northern", "Volta"];

export default function CreateListing() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file) => {
    try {
      const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID || "images";
      
      const response = await storage.createFile(
        bucketId,
        ID.unique(),
        file
      );
      
      const fileUrl = storage.getFileView(
        bucketId,
        response.$id
      );
      
      return fileUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title || !price || !category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Get current user
      const currentUser = await account.get();

      // Upload photo if selected
      let imageUrl = "";
      if (photoFile) {
        imageUrl = await uploadPhoto(photoFile);
      }

      // Create listing in Appwrite
      const listingData = {
        sellerId: currentUser.$id,
        title: title.trim(),
        description: description.trim() || "",
        price: parseFloat(price),
        category: category,
        imageUrl: imageUrl || "",
        location: location.trim()|| "",
        phone: phone.trim() || "",
        status: "active",
      };

      console.log("Creating listing:", listingData);

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LISTINGS,
        ID.unique(),
        listingData
      );

      console.log("Listing created:", response);
      toast.success("Listing published successfully!");
      navigate("/marketplace");
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error(error.message || "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground font-jakarta font-medium text-sm">Cancel</button>
          <h1 className="font-jakarta font-bold text-base">New Listing</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-4 space-y-4">
        {/* Photo */}
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
          <label className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-dashed border-border rounded-2xl py-10 cursor-pointer active:scale-[0.98] transition-transform">
            <Camera className="w-8 h-8 text-muted-foreground" />
            <span className="font-jakarta text-sm text-muted-foreground">Add photo</span>
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
        )}

        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Listing title" 
          className="w-full bg-card rounded-xl px-4 py-3 text-sm font-jakarta border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30" 
        />

        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Description" 
          rows={3} 
          className="w-full bg-card rounded-xl p-4 text-sm font-jakarta border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" 
        />

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-jakarta font-bold text-foreground">₵</span>
          <input 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            type="number" 
            placeholder="Price" 
            className="w-full bg-card rounded-xl pl-8 pr-4 py-3 text-sm font-jakarta border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30" 
          />
        </div>

        {/* Category */}
        <div className="relative">
          <button 
            onClick={() => setShowCategory(!showCategory)} 
            className="flex items-center bg-card rounded-xl px-4 py-3 border border-border/50 w-full"
          >
            <span className="text-sm font-jakarta flex-1 text-left">{category || "Select category"}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCategory ? "rotate-180" : ""}`} />
          </button>
          {showCategory && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border shadow-lg z-50">
              {categories.map((c) => (
                <button 
                  key={c} 
                  onClick={() => { setCategory(c); setShowCategory(false); }} 
                  className="w-full text-left px-4 py-2.5 text-sm font-jakarta hover:bg-muted"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="relative">
          <button 
            onClick={() => setShowLocation(!showLocation)} 
            className="flex items-center bg-card rounded-xl px-4 py-3 border border-border/50 w-full"
          >
            <span className="text-sm font-jakarta flex-1 text-left">{location || "Location (optional)"}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showLocation ? "rotate-180" : ""}`} />
          </button>
          {showLocation && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border shadow-lg z-50">
              {regions.map((r) => (
                <button 
                  key={r} 
                  onClick={() => { setLocation(r); setShowLocation(false); }} 
                  className="w-full text-left px-4 py-2.5 text-sm font-jakarta hover:bg-muted"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <input 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
          placeholder="Phone number (e.g. +233...)" 
          className="w-full bg-card rounded-xl px-4 py-3 text-sm font-jakarta border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30" 
        />

        <Button 
          onClick={handleSubmit} 
          disabled={!title || !price || !category || submitting} 
          className="w-full h-12 rounded-xl font-jakarta font-bold text-base bg-gradient-to-r from-primary to-red-500 hover:opacity-90"
        >
          {submitting ? "Publishing..." : "Publish Listing"}
        </Button>
      </div>
    </div>
  );
}