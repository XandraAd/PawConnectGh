import { useState, useEffect, useCallback } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";
import { Bell, X, MessageCircle, Heart, MessageSquare, PawPrint } from "lucide-react";
import StoryRow from "@/components/StoryRow";
import NearYouBanner from "@/components/NearYouBanner";
import FeedCard from "@/components/FeedCard";
import moment from "moment";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

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

  // Load unread count on mount
  useEffect(() => {
    if (user) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Helper to safely get unread count from a conversation
  const getUnreadCount = (conv) => {
    if (!conv.unreadCounts) return 0;
    // If it's already an object, use it directly
    if (typeof conv.unreadCounts === 'object') {
      return conv.unreadCounts[user.$id] || 0;
    }
    // Otherwise try to parse it as JSON
    try {
      const parsed = JSON.parse(conv.unreadCounts);
      return parsed[user.$id] || 0;
    } catch {
      return 0;
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      // 1. Get all conversations
      const convResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        [
          Query.contains("participantIds", user.$id),
          Query.limit(100)
        ]
      );
      let totalUnread = 0;
      const convNotifs = [];
      for (const conv of convResponse.documents) {
        const unread = getUnreadCount(conv);
        if (unread > 0) {
          totalUnread += unread;
          const otherId = conv.participantIds.find(id => id !== user.$id);
          let otherName = "Someone";
          if (otherId) {
            const profileRes = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PROFILES,
              [Query.equal("userId", otherId), Query.limit(1)]
            );
            if (profileRes.documents.length > 0) {
              otherName = profileRes.documents[0].fullName || "User";
            }
          }
          convNotifs.push({
            id: conv.$id,
            type: "message",
            message: `${otherName} sent you ${unread} message${unread > 1 ? 's' : ''}`,
            timestamp: conv.$updatedAt,
            count: unread,
          });
        }
      }

      // 2. Get user's posts to count likes/comments
      const myPostsRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        [
          Query.equal("userId", user.$id),
          Query.limit(50)
        ]
      );
      const likeNotifs = [];
      const commentNotifs = [];
      for (const post of myPostsRes.documents) {
        const likeCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
        const comments = post.commentCount || 0;
        if (likeCount > 0) {
          likeNotifs.push({
            id: post.$id + "_likes",
            type: "like",
            message: `${likeCount} like${likeCount > 1 ? 's' : ''} on "${post.content?.slice(0, 30) || 'your post'}"`,
            timestamp: post.$updatedAt,
            count: likeCount,
          });
        }
        if (comments > 0) {
          commentNotifs.push({
            id: post.$id + "_comments",
            type: "comment",
            message: `${comments} comment${comments > 1 ? 's' : ''} on "${post.content?.slice(0, 30) || 'your post'}"`,
            timestamp: post.$updatedAt,
            count: comments,
          });
        }
      }

      const allNotifs = [...convNotifs, ...likeNotifs, ...commentNotifs];
      allNotifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(allNotifs.slice(0, 10));
      setUnreadCount(allNotifs.length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleBellClick = () => {
    if (showNotifications) {
      setShowNotifications(false);
    } else {
      setShowNotifications(true);
      loadNotifications();
    }
  };

  const handleNotificationClick = async (notif) => {
    // Remove from list and decrease badge
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setUnreadCount((prev) => Math.max(0, prev - (notif.count || 1)));

    if (notif.type === "message") {
      try {
        const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.CONVERSATIONS, notif.id);
        // Build updated unreadCounts object
        let unreadCounts = {};
        if (conv.unreadCounts) {
          if (typeof conv.unreadCounts === 'object') {
            unreadCounts = conv.unreadCounts;
          } else {
            try { unreadCounts = JSON.parse(conv.unreadCounts); } catch {}
          }
        }
        unreadCounts[user.$id] = 0;
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONVERSATIONS, notif.id, {
          unreadCounts: JSON.stringify(unreadCounts),
        });
      } catch (err) {
        console.error('Failed to mark conversation as read:', err);
      }
      window.location.href = `/conversation/${notif.id}`;
    } else {
      const postId = notif.id.split('_')[0];
      if (postId) window.location.href = `/post/${postId}`;
    }
    setShowNotifications(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case "message": return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "like": return <Heart className="w-4 h-4 text-red-500" />;
      case "comment": return <MessageSquare className="w-4 h-4 text-green-500" />;
      default: return <PawPrint className="w-4 h-4 text-primary" />;
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
          {/* Logo + Title + Country */}
          <div className="flex items-center gap-1">
            <img
              src="/Paws_Connect_Logo.png"
              alt="Paws Connect"
              className="w-10 h-10 object-contain"
            />
            <h1 className="font-jakarta font-extrabold text-xl text-foreground whitespace-nowrap">
              Paws <span className="text-primary">Connect</span>
            </h1>
            <span className="text-[11px] font-jakarta text-muted-foreground ml-0.5">🇬🇭</span>
          </div>

          {/* Bell */}
          <div className="relative">
            <button
              onClick={handleBellClick}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform relative"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && !showNotifications && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-[9px] font-jakarta font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <h3 className="font-jakarta font-bold text-sm text-foreground">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(70vh-60px)] px-2 py-2">
                  {loadingNotifs ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="font-jakarta text-sm text-muted-foreground">No notifications yet</p>
                      <p className="font-jakarta text-xs text-muted-foreground mt-1">When someone interacts with you, it'll show here.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98] cursor-pointer"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-jakarta text-foreground leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] font-jakarta text-muted-foreground mt-0.5">
                            {moment(notif.timestamp).fromNow()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto">
        <button
          onClick={handleRefresh}
          className={`w-full text-center py-2 text-xs font-jakarta text-muted-foreground ${refreshing ? "opacity-100" : "opacity-0"} transition-opacity`}
        >
          {refreshing ? "Refreshing..." : "Pull to refresh"}
        </button>

        <StoryRow />
        <NearYouBanner />

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