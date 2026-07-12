import { useState, useEffect } from "react";
import { ID, Query, Permission, Role } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";

export default function CommentSection({ postId, onCommentAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadComments();
  }, [postId]);

  async function loadComments() {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [Query.equal('postId', postId), Query.orderAsc('$createdAt'), Query.limit(50)]
      );
      setComments(documents);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment() {
    if (!text.trim() || !user) return;
    setPosting(true);
    setError("");

    try {
      const newComment = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        ID.unique(),
        {
          postId,
          userId: user.$id,
          authorName: user.name,
          content: text.trim(),
        },
        // Document-level permissions: only this user can edit/delete this specific comment
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

      setComments((prev) => [...prev, newComment]);
      setText("");

      // Keep the post's commentCount in sync
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.POSTS, postId, {
          commentCount: (comments.length || 0) + 1,
        });
        onCommentAdded?.();
      } catch (err) {
        console.error('Failed to update comment count:', err);
      }
    } catch (err) {
      setError(err.message || 'Could not post comment. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="border-t border-border/50 px-4 py-3 space-y-3">
      {loading ? (
        <p className="text-xs text-muted-foreground font-jakarta">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground font-jakarta">No comments yet — be the first!</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.$id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-jakarta font-bold text-xs shrink-0">
                {c.authorName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-muted rounded-2xl px-3 py-2">
                  <p className="text-xs font-jakarta font-semibold text-foreground">{c.authorName || "User"}</p>
                  <p className="text-sm font-jakarta text-foreground/90 break-words">{c.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-jakarta ml-3">
                  {moment(c.$createdAt).fromNow()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {user && (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add a comment..."
            className="flex-1 bg-muted rounded-full px-3.5 py-2 text-sm font-jakarta focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleAddComment}
            disabled={!text.trim() || posting}
            className="text-sm font-jakarta font-semibold text-primary disabled:opacity-40 active:scale-95 transition-transform"
          >
            {posting ? "..." : "Post"}
          </button>
        </div>
      )}
    </div>
  );
}
