import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { Search, Plus, MapPin, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const categories = ["All", "Puppies", "Adult Dogs", "Accessories", "Food & Treats", "Vet Services"];
const regions = ["All Regions", "Greater Accra", "Ashanti", "Western", "Eastern", "Northern", "Volta"];

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState("All");
  const [region, setRegion] = useState("All Regions");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRegion, setShowRegion] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LISTINGS,
        [
          Query.equal("status", "active"), // Only show active listings
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]
      );
      console.log("📋 Listings found:", response.documents);
      setListings(response.documents);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = listings.filter((l) => {
    if (category !== "All" && l.category !== category) return false;
    if (region !== "All Regions" && l.location && !l.location.toLowerCase().includes(region.toLowerCase())) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return l.status === "active";
  });

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
        <div className="max-w-[430px] mx-auto px-4 pt-4 pb-3">
          <h1 className="font-jakarta font-bold text-lg text-foreground mb-3">Marketplace</h1>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search marketplace..."
              className="w-full bg-muted rounded-xl pl-10 pr-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-jakarta font-medium transition-colors active:scale-95 ${
                  category === c ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Region filter */}
          <div className="relative mt-2">
            <button
              onClick={() => setShowRegion(!showRegion)}
              className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 w-full active:scale-[0.98] transition-transform"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className={`text-xs font-jakarta font-medium flex-1 text-left ${region !== "All Regions" ? "text-primary" : "text-muted-foreground"}`}>
                {region}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${showRegion ? "rotate-180" : ""}`} />
            </button>
            {showRegion && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                {regions.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRegion(r); setShowRegion(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-jakarta hover:bg-muted transition-colors ${region === r ? "text-primary font-semibold" : "text-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-jakarta font-semibold text-foreground">No listings yet</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-1">Be the first to sell!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((l) => (
              <ProductCard key={l.$id} listing={l} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        to="/create-listing"
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-primary to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform z-50"
      >
        <Plus className="w-7 h-7 text-white" />
      </Link>
    </div>
  );
}