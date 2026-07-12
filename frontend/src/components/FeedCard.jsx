import { useState } from "react";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import CommentSection from "@/components/CommentSection";
import moment from "moment";

export default function FeedCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(post.likes?.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const handleLike = async () => {
    if (!currentUserId) return; // not logged in yet, shouldn't normally happen behind ProtectedRoute
    const newLikes = liked
      ? (post.likes || []).filter((id) => id !== currentUserId)
      : [...(post.likes || []), currentUserId];
    setLiked(!liked);
    setLikeCount(newLikes.length);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.POSTS, post.$id, { likes: newLikes });
    } catch (err) {
      console.error('Failed to update like:', err);
      // revert optimistic update on failure
      setLiked(liked);
      setLikeCount(post.likes?.length || 0);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.$id}`;
    const shareData = {
      title: post.authorName ? `${post.authorName} on PawConnect` : 'PawConnect',
      text: post.content?.slice(0, 100) || 'Check out this post on PawConnect',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // user cancelled the share sheet — not an error worth surfacing
      }
    } else {
      // Fallback for browsers without native share support (most desktop browsers)
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const typeColors = {
    "Lost Dog Alert": "bg-red-100 text-red-700",
    "Found Dog": "bg-green-100 text-green-700",
    "Looking for Mate": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-jakarta font-bold text-sm">
          {post.authorName?.[0] || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-jakarta font-semibold text-sm text-foreground truncate">{post.authorName || "User"}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="text-[11px] font-jakarta">{post.location || "Ghana"}</span>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-jakarta">{moment(post.$createdAt).fromNow()}</span>
      </div>

      {/* Tags */}
      <div className="px-4 pb-2 flex gap-2 flex-wrap">
        {post.dogName && (
          <span className="text-[11px] font-jakarta font-medium bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full">
            🐕 {post.dogName}
          </span>
        )}
        {post.postType && post.postType !== "Regular Post" && (
          <span className={`text-[11px] font-jakarta font-medium px-2.5 py-0.5 rounded-full ${typeColors[post.postType] || "bg-muted text-muted-foreground"}`}>
            {post.postType}
          </span>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm font-jakarta text-foreground/90 leading-relaxed">{post.content}</p>
      )}

      {/* Photo */}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="w-full aspect-[4/3] object-cover" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 px-4 py-3">
        <button onClick={handleLike} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          <span className="text-xs font-jakarta font-medium text-muted-foreground">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <MessageCircle className={`w-5 h-5 ${showComments ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs font-jakarta font-medium text-muted-foreground">{commentCount}</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <Share2 className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post.$id} onCommentAdded={() => setCommentCount((c) => c + 1)} />
      )}
    </div>
  );
}
