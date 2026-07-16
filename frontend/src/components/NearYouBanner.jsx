import { useState, useEffect } from "react";
import { Query } from "appwrite";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";

export default function NearYouBanner() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function loadNearbyCount() {
      try {
        // 1. Get the user's own region from their profile
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id);
        if (!profile.location) {
          setCount(null); // no region set — fall back to generic copy
          return;
        }
        setRegion(profile.location);

        // 2. Count dogs in that same region
        const { total } = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PETS,
          [
            Query.equal('species', 'dog'),
            Query.equal('location', profile.location),
            Query.equal('isSearchable', true),
            Query.limit(1), // we only need the total count, not the documents
          ]
        );
        setCount(total);
      } catch (err) {
        console.error('Failed to load nearby dog count:', err);
      }
    }

    loadNearbyCount();
  }, [user]);

  return (
    <Link to="/explore" className="block mx-4 my-3">
      <div className="bg-gradient-to-r from-primary to-red-500 rounded-2xl p-4 flex items-center gap-3 shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-jakarta font-bold text-white text-base">
            {count !== null && count > 0
              ? `${count} Dog${count === 1 ? '' : 's'} Near You`
              : "Dogs Near You"}
          </h3>
          <p className="font-jakarta text-white/80 text-xs mt-0.5">
            {region
              ? `Discover dogs and breeders in ${region}`
              : "Discover dogs and breeders in your area"}
          </p>
        </div>
        <span className="text-white/60 text-xl">→</span>
      </div>
    </Link>
  );
}
