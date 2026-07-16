import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MyDogs() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadDogs();
  }, []);

  const loadDogs = async () => {
    setLoading(true);
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [
          Query.equal("ownerId", currentUser.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]
      );
      setDogs(response.documents);
    } catch (error) {
      console.error("Error loading dogs:", error);
      toast.error("Failed to load your dogs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDog = async (dogId) => {
    if (!window.confirm("Are you sure you want to remove this dog?")) return;

    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PETS, dogId);
      setDogs(prev => prev.filter(dog => dog.$id !== dogId));
      toast.success("Dog removed successfully");
    } catch (error) {
      console.error("Error deleting dog:", error);
      // A 401 here almost always means this specific pet document predates
      // the owner-only permission fix and has no delete permission set —
      // see the note in AddDog.jsx about migrating legacy pet documents.
      toast.error("Failed to remove dog");
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
            <h1 className="font-jakarta font-bold text-lg text-foreground">My Dogs</h1>
          </div>
          <button
            onClick={() => navigate("/add-dog")}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 py-4">
        {dogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🐕</div>
            <p className="font-jakarta font-semibold text-foreground text-lg">No dogs yet</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-2">
              Add your first dog to get started!
            </p>
            <button
              onClick={() => navigate("/add-dog")}
              className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-jakarta font-semibold text-sm active:scale-95 transition-transform"
            >
              Add a Dog
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dogs.map((dog) => (
              <div
                key={dog.$id}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {dog.photoUrl ? (
                      <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-jakarta font-semibold text-foreground">{dog.name}</h3>
                    <p className="text-xs font-jakarta text-muted-foreground">{dog.breed}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-jakarta bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {dog.gender || "Unknown"} · {dog.ageYears || 0} yrs
                      </span>
                      {dog.size && (
                        <span className="text-[10px] font-jakarta bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                          {dog.size}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/add-dog?edit=${dog.$id}`)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteDog(dog.$id)}
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
