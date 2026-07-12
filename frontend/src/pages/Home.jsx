import { useState, useEffect, useCallback } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";
import { Bell } from "lucide-react";
import StoryRow from "@/components/StoryRow";
import NearYouBanner from "@/components/NearYouBanner";
import FeedCard from "@/components/FeedCard";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        [Query.orderDesc('$createdAt'), Query.limit(20)]
      );
      setPosts(documents);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
          <div>
            <h1 className="font-jakarta font-extrabold text-xl text-foreground">
              Paw<span className="text-primary">Connect</span>
            </h1>
            <p className="text-[11px] font-jakarta text-muted-foreground -mt-0.5">Ghana 🇬🇭</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform relative">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
          </button>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto">
        {/* Pull to refresh hint */}
        <button
          onClick={handleRefresh}
          className={`w-full text-center py-2 text-xs font-jakarta text-muted-foreground ${refreshing ? "opacity-100" : "opacity-0"} transition-opacity`}
        >
          {refreshing ? "Refreshing..." : "Pull to refresh"}
        </button>

        {/* Stories */}
        <StoryRow />

        {/* Near You Banner */}
        <NearYouBanner />

        {/* Feed */}
        <div className="px-4 space-y-4 mt-2">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🐾</p>
              <p className="font-jakarta font-semibold text-foreground">No posts yet</p>
              <p className="font-jakarta text-sm text-muted-foreground mt-1">Be the first to share!</p>
            </div>
          ) : (
            posts.map((post) => (
              <FeedCard key={post.$id} post={post} currentUserId={user?.$id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
