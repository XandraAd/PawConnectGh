import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { ArrowLeft, Plus, Edit, Trash2, Package, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LISTINGS,
        [
          Query.equal("sellerId", currentUser.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]
      );
      setListings(response.documents);
    } catch (error) {
      console.error("Error loading listings:", error);
      toast.error("Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.LISTINGS,
        listingId
      );
      setListings(prev => prev.filter(listing => listing.$id !== listingId));
      toast.success("Listing deleted successfully");
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500";
      case "sold": return "bg-blue-500/10 text-blue-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-gray-500/10 text-gray-500";
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-jakarta font-bold text-lg text-foreground">My Listings</h1>
          </div>
          <button
            onClick={() => navigate("/create-listing")}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-4">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <p className="font-jakarta font-semibold text-foreground text-lg">No listings yet</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-2">
              Create your first marketplace listing!
            </p>
            <button
              onClick={() => navigate("/create-listing")}
              className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-jakarta font-semibold text-sm active:scale-95 transition-transform"
            >
              Create Listing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.$id}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Listing Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {listing.imageUrl ? (
                      <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                    )}
                  </div>

                  {/* Listing Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-jakarta font-semibold text-foreground truncate">{listing.title}</h3>
                    <p className="font-jakarta font-bold text-primary text-sm">₵{listing.price?.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-jakarta bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {listing.category}
                      </span>
                      <span className={`text-[10px] font-jakarta px-2 py-0.5 rounded-full ${getStatusColor(listing.status)}`}>
                        {listing.status || "active"}
                      </span>
                      {listing.location && (
                        <span className="text-[10px] font-jakarta text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {listing.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/edit-listing/${listing.$id}`)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteListing(listing.$id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}