import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { Search, MapPin, Star, MessageCircle, ArrowLeft, ChevronDown, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const regions = ["All Regions", "Greater Accra", "Ashanti", "Western", "Eastern", "Northern", "Volta"];

export default function Breeders() {
  const navigate = useNavigate();
  const [breeders, setBreeders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [showRegion, setShowRegion] = useState(false);

  useEffect(() => {
    fetchBreeders();
  }, []);

  const fetchBreeders = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [
          Query.equal("isBreeder", true),
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );
      
      // Sort: featured first
      const breedersList = response.documents.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      });
      
      setBreeders(breedersList);
    } catch (error) {
      console.error("Error fetching breeders:", error);
    } finally {
      setLoading(false);
    }
  };

  const locationMatchesRegion = (location, regionName) => {
    if (!location || regionName === "All Regions") return true;
    const loc = location.toLowerCase().trim();
    const reg = regionName.toLowerCase().trim();
    if (loc.includes(reg)) return true;
    if (reg.includes(loc)) return true;
    if (reg === "greater accra") {
      const accraAreas = ["accra", "adenta", "tema", "madina", "dansoman", "labone", "airport", "dzorwulu"];
      return accraAreas.some(area => loc.includes(area));
    }
    if (reg === "ashanti") {
      return loc.includes("kumasi") || loc.includes("ashanti");
    }
    return false;
  };

  const filteredBreeders = breeders.filter((b) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch = b.fullName?.toLowerCase().includes(searchLower) || false;
      const usernameMatch = b.username?.toLowerCase().includes(searchLower) || false;
      if (!nameMatch && !usernameMatch) return false;
    }
    if (region !== "All Regions") {
      const breederLocation = b.location || "";
      if (!locationMatchesRegion(breederLocation, region)) return false;
    }
    return true;
  });

  const featuredBreeders = filteredBreeders.filter(b => b.isFeatured);
  const regularBreeders = filteredBreeders.filter(b => !b.isFeatured);

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
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-jakarta font-bold text-lg text-foreground">Breeders</h1>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search breeders by name..."
              className="w-full bg-muted rounded-xl pl-10 pr-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="relative">
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

      <div className="max-w-[430px] mx-auto px-4 mt-4">
        {/* Featured Breeders */}
        {featuredBreeders.length > 0 && !search && region === "All Regions" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h2 className="font-jakarta font-bold text-sm text-foreground">Featured Breeders</h2>
            </div>
            <div className="space-y-3">
              {featuredBreeders.map((breeder) => (
                <div
                  key={breeder.$id}
                  className="bg-gradient-to-r from-primary/5 to-yellow-500/5 rounded-2xl border-2 border-primary/30 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => navigate(`/breeder/${breeder.userId}`)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-yellow-500">
                        {breeder.avatarUrl ? (
                          <img src={breeder.avatarUrl} alt={breeder.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-jakarta font-bold text-primary">
                            {breeder.fullName?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] font-bold rounded-full px-1.5 py-0.5">
                        FEATURED
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-jakarta font-semibold text-foreground">{breeder.fullName || breeder.username}</h3>
                      <p className="text-xs font-jakarta text-muted-foreground">@{breeder.username}</p>
                      {breeder.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="text-[11px] font-jakarta text-muted-foreground">{breeder.location}</span>
                        </div>
                      )}
                      {breeder.bio && (
                        <p className="text-xs font-jakarta text-muted-foreground mt-1 line-clamp-1">{breeder.bio}</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/breeder/${breeder.userId}`);
                      }}
                      className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Breeders */}
        {filteredBreeders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👤</div>
            <p className="font-jakarta font-semibold text-foreground text-lg">No breeders found</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-2">
              {search || region !== "All Regions" 
                ? "Try adjusting your filters" 
                : "Be the first to register as a breeder!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {regularBreeders.length > 0 && featuredBreeders.length > 0 && (
              <div className="flex items-center gap-2 mt-4 mb-3">
                <div className="flex-1 border-t border-border/50" />
                <span className="text-xs font-jakarta text-muted-foreground">All Breeders</span>
                <div className="flex-1 border-t border-border/50" />
              </div>
            )}
            {regularBreeders.map((breeder) => (
              <div
                key={breeder.$id}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate(`/breeder/${breeder.userId}`)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    {breeder.avatarUrl ? (
                      <img src={breeder.avatarUrl} alt={breeder.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-jakarta font-bold text-primary">
                        {breeder.fullName?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-jakarta font-semibold text-foreground">{breeder.fullName || breeder.username}</h3>
                    <p className="text-xs font-jakarta text-muted-foreground">@{breeder.username}</p>
                    {breeder.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="text-[11px] font-jakarta text-muted-foreground">{breeder.location}</span>
                      </div>
                    )}
                    {breeder.bio && (
                      <p className="text-xs font-jakarta text-muted-foreground mt-1 line-clamp-1">{breeder.bio}</p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/breeder/${breeder.userId}`);
                    }}
                    className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}