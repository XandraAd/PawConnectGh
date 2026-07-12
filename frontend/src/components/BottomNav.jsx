import { Link, useLocation } from "react-router-dom";
import { Home, Search, User, Plus, MessageCircle, Store } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";

// Order tabs: Home, Explore, (Plus center), Marketplace, Messages, Profile
// We'll keep the array without the center tab for the regular ones
const tabItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/marketplace", icon: Store, label: "Marketplace" },
  { path: "/messages", icon: MessageCircle, label: "Messages", badge: true },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const isMessagesActive = location.pathname === "/messages";
  const subscriptionRef = useRef(null);

  // Calculate unread count (same as before)
  const calculateUnread = (conversations) => {
    if (!user || !conversations.length) return 0;
    let total = 0;
    for (const conv of conversations) {
      const count = conv.unreadCounts?.[user.$id] || 0;
      total += count;
    }
    return total;
  };

  useEffect(() => {
    if (!user) return;

    const loadUnread = async () => {
      try {
        const { documents: conversations } = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CONVERSATIONS,
          [
            Query.contains("participantIds", user.$id),
            Query.limit(100),
          ]
        );
        const total = calculateUnread(conversations);
        setUnread(total);
      } catch (err) {
        console.error("Failed to load unread count:", err);
      }
    };

    loadUnread();

    // Real-time subscriptions (same as before)
    const unsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.CONVERSATIONS}.documents`,
      (response) => {
        if (response.payload && response.payload.participantIds?.includes(user.$id)) {
          loadUnread();
        }
      }
    );

    const messageUnsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      async (response) => {
        if (
          response.payload &&
          response.payload.senderId !== user.$id &&
          response.event === "databases.*.collections.*.documents.create"
        ) {
          loadUnread();
        }
      }
    );

    subscriptionRef.current = { unsubscribe, messageUnsubscribe };

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current.messageUnsubscribe();
      }
    };
  }, [user]);

  // Reset unread when on Messages page
  useEffect(() => {
    if (isMessagesActive && user) {
      setUnread(0);
    }
  }, [isMessagesActive, user]);

  // Determine which tab is active (exact match)
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-1 py-1 relative">
        {/* Regular tabs (left side) */}
        {tabItems.slice(0, 2).map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 w-14 active:scale-95 transition-transform"
          >
            <div className="relative">
              <tab.icon
                className={`w-6 h-6 transition-colors ${
                  isActive(tab.path) ? "text-primary" : "text-muted-foreground/70"
                }`}
                strokeWidth={isActive(tab.path) ? 2.5 : 1.8}
              />
            </div>
            <span
              className={`text-[10px] font-jakarta font-medium ${
                isActive(tab.path) ? "text-primary" : "text-muted-foreground/70"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}

        {/* Center Plus Button */}
        <Link
          to="/create-post"
          className="relative -mt-6 flex flex-col items-center justify-center"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-red-500 flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-transform">
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-jakarta text-primary font-medium mt-0.5">Post</span>
        </Link>

        {/* Regular tabs (right side) */}
        {tabItems.slice(2).map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 w-14 active:scale-95 transition-transform"
          >
            <div className="relative">
              <tab.icon
                className={`w-6 h-6 transition-colors ${
                  isActive(tab.path) ? "text-primary" : "text-muted-foreground/70"
                }`}
                strokeWidth={isActive(tab.path) ? 2.5 : 1.8}
              />
              {tab.badge && unread > 0 && !isMessagesActive && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-jakarta font-bold animate-pulse">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-jakarta font-medium ${
                isActive(tab.path) ? "text-primary" : "text-muted-foreground/70"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}