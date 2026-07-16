import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query } from "appwrite";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Copy, Flag, Trash, X, Link, Send
} from "lucide-react";
import { FaFacebook, FaTwitter, FaEnvelope } from "react-icons/fa";
import { IoLogoWhatsapp } from "react-icons/io5";
import { toast } from "sonner";
import moment from "moment";
import { useAuth } from "@/lib/AuthContext";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const postData = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.POSTS,
        postId
      );
      setPost(postData);

      const likesArray = postData.likes || [];
      setLikesCount(likesArray.length);
      if (user) {
        setLiked(likesArray.includes(user.$id));
      }

      try {
        const commentsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          [Query.equal("postId", postId), Query.limit(1)]
        );
        setCommentCount(commentsResponse.total || 0);
      } catch {
        setCommentCount(postData.commentCount || 0);
      }

      if (postData.userId) {
        const profileResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          [Query.equal("userId", postData.userId), Query.limit(1)]
        );
        if (profileResponse.documents.length > 0) {
          setAuthor(profileResponse.documents[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      toast.error("Failed to load post");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like posts");
      return;
    }
    if (isLiking || !post) return;

    setIsLiking(true);
    const currentLikes = post.likes || [];
    const newLiked = !liked;
    const newLikesArray = newLiked
      ? [...currentLikes, user.$id]
      : currentLikes.filter((id) => id !== user.$id);

    setLiked(newLiked);
    setLikesCount(newLikesArray.length);

    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.POSTS, postId, {
        likes: newLikesArray,
      });
      setPost((prev) => ({ ...prev, likes: newLikesArray }));
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
      setLiked(!newLiked);
      setLikesCount(currentLikes.length);
    } finally {
      setIsLiking(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: post.content || "Check out this post",
      text: post.content || "Check out this post on PetApp!",
      url: window.location.href,
    };
    try {
      await navigator.share(shareData);
      setShowShareModal(false);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        toast.error("Share failed");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
      setShowShareModal(false);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(post.content + " " + window.location.href)}`;
    window.open(url, "_blank");
    setShowShareModal(false);
  };

  const handleShareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank");
    setShowShareModal(false);
  };

  const handleShareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content || "Check out this post!")}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank");
    setShowShareModal(false);
  };

  const handleShareToEmail = () => {
    const subject = encodeURIComponent(post.content || "Check out this post");
    const body = encodeURIComponent(`Check out this post:\n${window.location.href}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    setShowShareModal(false);
  };

  const handleShare = () => setShowShareModal(true);
  const handleComment = () => navigate(`/post/${postId}/comments`);
  const handleReport = () => toast.info("Report feature coming soon");

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.POSTS, postId);
      toast.success("Post deleted");
      navigate(-1);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete post");
    }
  };

  const isOwner = user && post && user.$id === post.userId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  const authorName = author?.fullName || author?.username || "Unknown";
  const authorAvatar = author?.avatarUrl || null;

  const ShareModal = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-[430px] bg-card rounded-t-2xl pb-safe animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-jakarta font-bold text-base text-foreground">Share</h3>
          <button
            onClick={() => setShowShareModal(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-jakarta font-medium text-sm text-foreground">Share</p>
                <p className="text-xs font-jakarta text-muted-foreground">Via your device</p>
              </div>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Link className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-jakarta font-medium text-sm text-foreground">Copy Link</p>
              <p className="text-xs font-jakarta text-muted-foreground">Share the link to this post</p>
            </div>
          </button>

          <button
            onClick={handleShareToWhatsApp}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <IoLogoWhatsapp className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-jakarta font-medium text-sm text-foreground">WhatsApp</p>
              <p className="text-xs font-jakarta text-muted-foreground">Share via WhatsApp</p>
            </div>
          </button>

          <button
            onClick={handleShareToFacebook}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
              <FaFacebook className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-jakarta font-medium text-sm text-foreground">Facebook</p>
              <p className="text-xs font-jakarta text-muted-foreground">Share on Facebook</p>
            </div>
          </button>

          <button
            onClick={handleShareToTwitter}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
              <FaTwitter className="w-5 h-5 text-black dark:text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-jakarta font-medium text-sm text-foreground">Twitter (X)</p>
              <p className="text-xs font-jakarta text-muted-foreground">Share on Twitter</p>
            </div>
          </button>

          <button
            onClick={handleShareToEmail}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center shrink-0">
              <FaEnvelope className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-jakarta font-medium text-sm text-foreground">Email</p>
              <p className="text-xs font-jakarta text-muted-foreground">Share via Email</p>
            </div>
          </button>
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={() => setShowShareModal(false)}
            className="w-full py-3 rounded-xl bg-muted text-foreground font-jakarta font-semibold text-sm active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-jakarta font-bold text-lg text-foreground">Post</h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl border border-border/50 shadow-lg z-50 py-1 overflow-hidden">
                {isOwner ? (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-sm font-jakarta text-red-500 hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete Post
                  </button>
                ) : (
                  <button
                    onClick={handleReport}
                    className="w-full text-left px-4 py-2.5 text-sm font-jakarta text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                )}
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-4 py-2.5 text-sm font-jakarta text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto">
        <div className="bg-card overflow-hidden">
          {post.imageUrl && (
            <div className="w-full aspect-square bg-muted">
              <img src={post.imageUrl} alt={post.content} className="w-full h-full object-cover" />
            </div>
          )}
          {post.content && (
            <div className="p-4">
              <p className="font-jakarta text-sm text-foreground leading-relaxed">{post.content}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                {authorAvatar ? (
                  <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-jakarta font-bold text-primary">
                    {authorName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div>
                <p className="font-jakarta font-semibold text-sm text-foreground">{authorName}</p>
                <p className="text-xs font-jakarta text-muted-foreground">
                  {moment(post.$createdAt).format("MMMM Do, YYYY")}
                </p>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 transition-colors active:scale-95 ${
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              } disabled:opacity-50`}
            >
              <Heart className={`w-6 h-6 ${liked ? "fill-red-500" : ""}`} />
              <span className="text-xs font-jakarta font-medium">{likesCount || 0}</span>
            </button>
            <button
              onClick={handleComment}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors active:scale-95"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-jakarta font-medium">{commentCount || 0}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors active:scale-95"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-xs font-jakarta font-medium">Share</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border/50">
          <button
            onClick={handleComment}
            className="w-full text-center text-xs font-jakarta text-muted-foreground hover:text-primary transition-colors"
          >
            {commentCount === 0
              ? "No comments yet. Be the first!"
              : `View all ${commentCount} comments`}
          </button>
        </div>
      </div>

      {showShareModal && <ShareModal />}
    </div>
  );
}
