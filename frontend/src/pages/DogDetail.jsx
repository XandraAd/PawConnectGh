import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { ArrowLeft, MapPin, PawPrint, Calendar, Heart, User } from "lucide-react";
import { toast } from "sonner";

export default function DogDetail() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const [dog, setDog] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDog();
  }, [dogId]);

  const fetchDog = async () => {
    setLoading(true);
    try {
      // 1) Fetch dog document
      const dogData = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.PETS,
        dogId
      );
      setDog(dogData);

      // 2) Fetch owner's profile (if ownerId exists)
      if (dogData.ownerId) {
        const profileResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          [Query.equal("userId", dogData.ownerId), Query.limit(1)]
        );
        if (profileResponse.documents.length > 0) {
          setOwner(profileResponse.documents[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching dog:", error);
      toast.error("Dog not found");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">🐕</div>
        <h2 className="font-jakarta font-bold text-xl text-foreground">Dog not found</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  const ownerName = owner?.fullName || owner?.username || "Unknown";
  const ownerAvatar = owner?.avatarUrl || null;

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
          <h1 className="font-jakarta font-bold text-lg text-foreground">{dog.name}</h1>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-4">
        {/* Dog Photo */}
        <div className="aspect-square bg-muted rounded-2xl overflow-hidden mb-4">
          {dog.photoUrl ? (
            <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🐕</div>
          )}
        </div>

        {/* Dog Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-jakarta font-bold text-xl">{dog.name}</h2>
            <button className="p-2 rounded-full bg-primary/10 text-primary active:scale-95 transition-transform">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Breed and tags */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-accent rounded-full text-xs font-jakarta font-medium">
              {dog.breed}
            </span>
            <span className="px-3 py-1 bg-accent rounded-full text-xs font-jakarta font-medium">
              {dog.gender || "Unknown"}
            </span>
            <span className="px-3 py-1 bg-accent rounded-full text-xs font-jakarta font-medium">
              {dog.ageYears || 0} yrs
            </span>
            {dog.size && (
              <span className="px-3 py-1 bg-accent rounded-full text-xs font-jakarta font-medium">
                {dog.size}
              </span>
            )}
          </div>

          {/* Location */}
          {dog.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-jakarta">{dog.location}</span>
            </div>
          )}

          {/* Color, weight */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {dog.color && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Color:</span>
                <span className="font-medium">{dog.color}</span>
              </div>
            )}
            {dog.weight && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-medium">{dog.weight} kg</span>
              </div>
            )}
          </div>

          {/* Description */}
          {dog.description && (
            <div className="mt-2">
              <h3 className="font-jakarta font-semibold text-sm mb-1">About {dog.name}</h3>
              <p className="text-sm font-jakarta text-foreground/70 leading-relaxed">
                {dog.description}
              </p>
            </div>
          )}

          {/* Health info */}
          <div className="flex flex-wrap gap-3 mt-2">
            {dog.vaccinated && (
              <span className="text-xs font-jakarta text-green-600 flex items-center gap-1">
                ✅ Vaccinated
              </span>
            )}
            {dog.neutered && (
              <span className="text-xs font-jakarta text-green-600 flex items-center gap-1">
                ✅ Neutered/Spayed
              </span>
            )}
          </div>

          {/* Owner info */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {ownerAvatar ? (
                  <img src={ownerAvatar} alt={ownerName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-jakarta font-semibold text-sm">Owner</p>
                <p className="text-sm font-jakarta text-foreground">{ownerName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}