import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { Search, ChevronDown, MapPin, Calendar, Users, Sparkles, PawPrint } from "lucide-react";
import { Link } from "react-router-dom";

const breeds = ["All", "German Shepherd", "Boerboel", "Rottweiler", "Labrador", "Mixed Breed"];
const regions = ["All Regions", "Greater Accra", "Ashanti", "Western", "Eastern", "Northern", "Volta"];

export default function Explore() {
  const [tab, setTab] = useState("dogs");
  const [breed, setBreed] = useState("All");
  const [region, setRegion] = useState("All Regions");
  const [search, setSearch] = useState("");
  const [dogs, setDogs] = useState([]);
  const [showRegion, setShowRegion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [
          Query.equal("isSearchable", true),
          Query.orderDesc("$createdAt"),
          Query.limit(30)
        ]
      );
      console.log("🐕 Dogs fetched:", response.documents);
      setDogs(response.documents);
    } catch (error) {
      console.error("Error fetching dogs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Smart location matching - checks if location contains region OR vice versa
  const locationMatchesRegion = (location, regionName) => {
    if (!location || regionName === "All Regions") return true;
    
    const loc = location.toLowerCase().trim();
    const reg = regionName.toLowerCase().trim();
    
    // Check if location contains the region name
    if (loc.includes(reg)) return true;
    
    // Check if region name contains the location (for cases like "Accra" vs "Greater Accra")
    if (reg.includes(loc)) return true;
    
    // Special case: if region is "Greater Accra", also match "Accra" and "Adenta"
    if (reg === "greater accra") {
      const accraAreas = ["accra", "adenta", "tema", "madina", "dansoman", "labone", "airport", "dzorwulu"];
      return accraAreas.some(area => loc.includes(area));
    }
    
    // Special case: if region is "Ashanti", also match "Kumasi"
    if (reg === "ashanti") {
      return loc.includes("kumasi") || loc.includes("ashanti");
    }
    
    return false;
  };

  // Apply all filters
  const filteredDogs = dogs.filter((d) => {
    // Breed filter - handle "Mixed Breed" specially
    if (breed !== "All") {
      if (breed === "Mixed Breed") {
        const isMixed = d.breed && (
          d.breed.toLowerCase().includes("mix") ||
          d.breed.toLowerCase().includes("mixed") ||
          d.breed === "Mixed Breed"
        );
        if (!isMixed) return false;
      } else {
        if (d.breed !== breed) return false;
      }
    }
    
    // Search filter (by name)
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Region filter - Smart matching
    if (region !== "All Regions") {
      const dogLocation = d.location || "";
      if (!locationMatchesRegion(dogLocation, region)) return false;
    }
    
    return true;
  });

  const tabs = [
    { id: "dogs", label: "Dogs", icon: "🐕" },
    { id: "breeders", label: "Breeders", icon: null, lucide: Users },
    { id: "events", label: "Events", icon: null, lucide: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto px-4 pt-4 pb-3">
          <h1 className="font-jakarta font-bold text-lg text-foreground mb-3">Explore</h1>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dogs, breeders, events..."
              className="w-full bg-muted rounded-xl pl-10 pr-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Breed chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {breeds.map((b) => (
              <button
                key={b}
                onClick={() => setBreed(b)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-jakarta font-medium transition-colors active:scale-95 ${
                  breed === b
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-3">
        {/* Region dropdown */}
        <div className="relative mb-3">
          <button
            onClick={() => setShowRegion(!showRegion)}
            className="flex items-center gap-2 bg-card rounded-xl px-3 py-2.5 border border-border/50 w-full active:scale-[0.98] transition-transform"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-jakarta font-medium text-foreground flex-1 text-left">{region}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showRegion ? "rotate-180" : ""}`} />
          </button>
          {showRegion && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegion(r); setShowRegion(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-jakarta hover:bg-muted transition-colors ${region === r ? "text-primary font-semibold" : "text-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-jakarta font-semibold transition-all ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.icon ? <span>{t.icon}</span> : <t.lucide className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>

        {/* AI Playmate Banner */}
        {tab === "dogs" && (
          <Link to="/playmates" className="block mb-4 active:scale-[0.98] transition-transform">
            <div className="bg-gradient-to-r from-primary to-red-500 rounded-2xl p-4 flex items-center gap-3 shadow-md shadow-primary/20">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-jakarta font-bold text-white text-sm">AI Playmate Finder</h3>
                  <Sparkles className="w-3.5 h-3.5 text-white/80" />
                </div>
                <p className="font-jakarta text-white/80 text-xs mt-0.5">Find the perfect doggy friend nearby</p>
              </div>
              <span className="text-white/60 text-lg">→</span>
            </div>
          </Link>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        )}

        {/* Dogs Grid */}
        {tab === "dogs" && !loading && (
          <div className="grid grid-cols-2 gap-3">
            {filteredDogs.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-jakarta font-semibold text-foreground">No dogs found</p>
                <p className="font-jakarta text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredDogs.map((dog) => (
                <div 
                  key={dog.$id} 
                  className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => window.location.href = `/dog/${dog.$id}`}
                >
                  <div className="aspect-square bg-muted">
                    {dog.photoUrl ? (
                      <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🐕</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-jakarta font-semibold text-sm">{dog.name}</h3>
                    <p className="text-[11px] font-jakarta text-muted-foreground">{dog.breed}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] font-jakarta bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {dog.gender || "Unknown"} · {dog.ageYears || 0} yrs
                      </span>
                      {dog.location && (
                        <span className="text-[10px] font-jakarta bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                          📍 {dog.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Breeders Tab */}
        {tab === "breeders" && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👤</div>
            <p className="font-jakarta font-semibold text-foreground text-lg">Breeders Directory</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-2">
              Find and connect with top breeders in Ghana
            </p>
            <Link 
              to="/breeders" 
              className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-primary to-red-500 text-white rounded-xl font-jakarta font-semibold text-sm active:scale-95 transition-transform shadow-lg shadow-primary/20"
            >
              Browse All Breeders →
            </Link>
          </div>
        )}

        {/* Events placeholder */}
        {tab === "events" && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-jakarta font-semibold text-foreground">Events</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-1">Dog shows and meetups coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}