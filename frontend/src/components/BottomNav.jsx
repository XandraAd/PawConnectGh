import { Link, useLocation } from "react-router-dom";
import { Home, Search, User, Plus, MessageCircle, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import client from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";

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

  const calculateUnread = (conversations) => {
    if (!user || !conversations.length) return 0;
    let total = 0;
    for (const conv of conversations) {
      const unreadCounts = conv.unreadCounts ? JSON.parse(conv.unreadCounts) : {};
      total += unreadCounts[user.$id] || 0;
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
        setUnread(calculateUnread(conversations));
      } catch (err) {
        console.error("Failed to load unread count:", err);
      }
    };

    loadUnread();

    const unsubConversations = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.CONVERSATIONS}.documents`,
      (response) => {
        if (response.payload?.participantIds?.includes(user.$id)) {
          loadUnread();
        }
      }
    );

    const unsubMessages = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        if (
          response.payload &&
          response.payload.senderId !== user.$id &&
          response.events?.some((e) => e.endsWith('.create'))
        ) {
          loadUnread();
        }
      }
    );

    return () => {
      unsubConversations();
      unsubMessages();
    };
  }, [user]);

  useEffect(() => {
    if (isMessagesActive && user) {
      setUnread(0);
    }
  }, [isMessagesActive, user]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border/50 safe-area-bottom shadow-lg shadow-black/5">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 py-1.5 relative">
        {tabItems.slice(0, 2).map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 active:scale-95"
          >
            <div className="relative">
              <tab.icon
                className={`w-6 h-6 transition-all duration-200 ${
                  isActive(tab.path)
                    ? "text-primary drop-shadow-md"
                    : "text-muted-foreground/70 group-hover:text-foreground"
                }`}
                strokeWidth={isActive(tab.path) ? 2.5 : 1.8}
              />
              {isActive(tab.path) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
              )}
            </div>
            <span
              className={`text-[11px] font-jakarta font-medium tracking-wide transition-colors ${
                isActive(tab.path) ? "text-primary" : "text-muted-foreground/70"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}

        {/* Center Post Button */}
        <Link
          to="/create-post"
          className="relative -mt-5 flex flex-col items-center justify-center group"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-red-500 flex items-center justify-center shadow-lg shadow-primary/50 active:scale-95 transition-transform duration-200 hover:shadow-primary/70">
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-jakarta font-medium text-primary mt-0.5 group-hover:text-primary/80 transition-colors">
            Post
          </span>
        </Link>

        {tabItems.slice(2).map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 active:scale-95"
          >
            <div className="relative">
              <tab.icon
                className={`w-6 h-6 transition-all duration-200 ${
                  isActive(tab.path)
                    ? "text-primary drop-shadow-md"
                    : "text-muted-foreground/70 group-hover:text-foreground"
                }`}
                strokeWidth={isActive(tab.path) ? 2.5 : 1.8}
              />
              {tab.badge && unread > 0 && !isMessagesActive && (
                <span className="absolute -top-1 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-jakarta font-bold animate-pulse border-2 border-card">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              {isActive(tab.path) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
              )}
            </div>
            <span
              className={`text-[11px] font-jakarta font-medium tracking-wide transition-colors ${
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