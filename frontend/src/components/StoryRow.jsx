import { useState, useEffect } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";

// "isNew" = this person posted within the last 24 hours
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function StoryRow() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      try {
        // Grab recent posts, most recent first
        const { documents: recentPosts } = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.POSTS,
          [Query.orderDesc('$createdAt'), Query.limit(30)]
        );

        // Reduce to one entry per unique user (their most recent post)
        const seen = new Map();
        for (const post of recentPosts) {
          if (!seen.has(post.userId)) {
            seen.set(post.userId, post);
          }
        }
        const uniqueUserIds = [...seen.keys()].slice(0, 10); // cap at 10 avatars

        if (uniqueUserIds.length === 0) {
          setStories([]);
          setLoading(false);
          return;
        }

        // Fetch their profiles for name + avatar
        const { documents: profiles } = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          [Query.equal('userId', uniqueUserIds)]
        );

        const now = Date.now();
        const combined = uniqueUserIds
          .map((uid) => {
            const profile = profiles.find((p) => p.userId === uid);
            const post = seen.get(uid);
            if (!profile) return null;
            return {
              userId: uid,
              name: profile.username,
              img: profile.avatarUrl,
              isNew: now - new Date(post.$createdAt).getTime() < NEW_WINDOW_MS,
            };
          })
          .filter(Boolean);

        setStories(combined);
      } catch (err) {
        console.error('Failed to load stories:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, []);

  if (loading || stories.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
      {stories.map((s) => (
        <div key={s.userId} className="flex flex-col items-center gap-1 shrink-0">
          <div className={`w-16 h-16 rounded-full p-[2.5px] ${s.isNew ? "bg-gradient-to-br from-primary to-red-500" : "bg-border"}`}>
            {s.img ? (
              <img
                src={s.img}
                alt={s.name}
                className="w-full h-full rounded-full object-cover border-2 border-card"
              />
            ) : (
              <div className="w-full h-full rounded-full border-2 border-card bg-muted flex items-center justify-center font-jakarta font-bold text-primary text-sm">
                {s.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <span className="text-[11px] font-jakarta font-medium text-foreground/70 truncate max-w-[64px]">{s.name}</span>
        </div>
      ))}
    </div>
  );
}
