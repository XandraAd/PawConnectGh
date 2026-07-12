import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { ArrowLeft, MapPin, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    setLoading(true);
    try {
      // Get current user
      const currentUser = await account.get();
      setUser(currentUser);

      // Get listing by ID
      const listingData = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.LISTINGS,
        listingId
      );
      setListing(listingData);

      // Get seller profile info
      if (listingData.sellerId) {
        try {
          const sellerProfile = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            listingData.sellerId
          );
          setListing(prev => ({
            ...prev,
            seller_name: sellerProfile.fullName || sellerProfile.username || "Seller",
            seller_avatar: sellerProfile.avatarUrl || "",
            seller_location: sellerProfile.location || "",
          }));
        } catch (error) {
          console.log("Could not fetch seller profile:", error);
        }
      }
    } catch (error) {
      console.error("Error loading listing:", error);
      toast.error("Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      toast.error("Please log in to message the seller");
      return;
    }

    if (user.$id === listing.sellerId) {
      toast.info("This is your own listing");
      return;
    }

    setStartingChat(true);
    try {
      // Check if conversation already exists
      const existingConversations = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        [
          Query.equal("listingId", listingId),
          Query.search("participantIds", user.$id),
          Query.limit(1)
        ]
      );

      if (existingConversations.documents.length > 0) {
        navigate(`/conversation/${existingConversations.documents[0].$id}`);
        setStartingChat(false);
        return;
      }

      // Create new conversation
      const newConversation = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        ID.unique(),
        {
          listingId: listing.$id,
          listingTitle: listing.title,
          listingImage: listing.imageUrl || null,
          listingPrice: listing.price,
          participantIds: [user.$id, listing.sellerId],
          type: "listing",
          name: `Chat about ${listing.title}`,
          lastMessage: "",
          lastMessageAt: new Date().toISOString(),
        }
      );

      // Create initial system message
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          conversationId: newConversation.$id,
          senderId: "system",
          content: `Conversation started about ${listing.title}`,
          role: "system",
        }
      );

      navigate(`/conversation/${newConversation.$id}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-jakarta text-muted-foreground">Listing not found</p>
      </div>
    );
  }

  const isOwner = user && user.$id === listing.sellerId;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Photo */}
      <div className="w-full aspect-square bg-muted">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🐕</div>
        )}
      </div>

      <div className="max-w-[430px] mx-auto px-4 -mt-6 relative">
        <div className="bg-card rounded-2xl p-5 shadow-lg border border-border/50">
          <div className="flex items-start justify-between mb-2">
            <h1 className="font-jakarta font-bold text-xl text-foreground">{listing.title}</h1>
            <span className="text-xs font-jakarta font-medium bg-accent text-accent-foreground px-2.5 py-1 rounded-full shrink-0 ml-3">
              {listing.category}
            </span>
          </div>
          <p className="font-jakarta font-extrabold text-2xl text-primary mb-3">
            ₵{listing.price?.toLocaleString()}
          </p>

          <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-jakarta">{listing.location || "Ghana"}</span>
          </div>

          {listing.description && (
            <p className="text-sm font-jakarta text-foreground/80 leading-relaxed mb-4">{listing.description}</p>
          )}

          {/* Seller */}
          <div className="bg-muted rounded-xl p-3 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-jakarta font-bold">
              {listing.seller_name?.[0] || "S"}
            </div>
            <div>
              <p className="font-jakarta font-semibold text-sm">{listing.seller_name || "Seller"}</p>
              <p className="text-xs font-jakarta text-muted-foreground">Seller</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border/50 p-4">
        <div className="max-w-[430px] mx-auto flex gap-3">
          {listing.phone && (
            <Button
              variant="outline"
              className="h-12 rounded-xl font-jakarta font-semibold gap-2 px-4"
              onClick={() => window.open(`tel:${listing.phone}`)}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 rounded-xl font-jakarta font-semibold gap-2 bg-primary hover:opacity-90"
            disabled={startingChat || isOwner}
            onClick={handleStartChat}
          >
            <MessageCircle className="w-4 h-4" />
            {isOwner ? "Your Listing" : startingChat ? "Opening..." : "Message Seller"}
          </Button>
        </div>
      </div>
    </div>
  );
}
