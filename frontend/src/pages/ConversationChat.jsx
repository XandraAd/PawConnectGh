import { useState, useEffect, useRef } from "react";
import { databases, DATABASE_ID, COLLECTIONS, account, } from "@/lib/appwriteClient";
import client from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

export default function ConversationChat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [otherName, setOtherName] = useState("User");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      const conversation = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        conversationId
      );
      setConv(conversation);

      // Look up the other participant's real name
      const otherId = conversation.participantIds?.find((id) => id !== currentUser.$id);
      if (otherId) {
        try {
          const otherProfile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, otherId);
          setOtherName(otherProfile.fullName || otherProfile.username || "User");
        } catch {
          setOtherName("User"); // profile may not exist / not readable
        }
      }

      const messagesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal("conversationId", conversationId),
          Query.orderAsc("$createdAt"),
          Query.limit(100)
        ]
      );
      setMessages(messagesResponse.documents);

      await markAsRead(conversation, currentUser);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  // Resets THIS user's unread count on the conversation to 0. This is the
  // real read-receipt: it's what the Home page notification badge reads from,
  // so opening a conversation here (not just clicking its notification)
  // correctly clears it too.
  const markAsRead = async (conversation, currentUser) => {
    try {
      const unreadCounts = conversation.unreadCounts ? JSON.parse(conversation.unreadCounts) : {};
      if (unreadCounts[currentUser.$id] === 0 || !unreadCounts[currentUser.$id]) return; // already clear, skip write
      unreadCounts[currentUser.$id] = 0;
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONVERSATIONS, conversation.$id, {
        unreadCounts: JSON.stringify(unreadCounts),
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // Realtime subscription for new incoming messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        if (response.payload && response.payload.conversationId === conversationId) {
          setMessages((prev) => {
            if (prev.find((m) => m.$id === response.payload.$id)) return prev;
            if (response.payload.senderId === user?.$id) return prev; // avoid dupes with our own optimistic add
            return [...prev, response.payload];
          });
        }
      }
    );

    return () => unsubscribe();
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending || !user || !conv) return;
    setSending(true);
    const msgText = text.trim();
    setText("");

    try {
      const newMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          conversationId: conversationId,
          senderId: user.$id,
          senderName: user.name || "User",
          content: msgText,
        }
      );

      setMessages((prev) => [...prev, newMessage]);

      // Bump unread count for every OTHER participant — this is what makes
      // the notification badge on Home actually light up for them.
      const unreadCounts = conv.unreadCounts ? JSON.parse(conv.unreadCounts) : {};
      const otherParticipants = (conv.participantIds || []).filter((id) => id !== user.$id);
      for (const id of otherParticipants) {
        unreadCounts[id] = (unreadCounts[id] || 0) + 1;
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        conversationId,
        {
          lastMessage: msgText,
          lastMessageAt: new Date().toISOString(),
          unreadCounts: JSON.stringify(unreadCounts),
        }
      );

      setConv((prev) => ({ ...prev, lastMessage: msgText, unreadCounts: JSON.stringify(unreadCounts) }));
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading || !conv || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-jakarta font-bold text-sm text-foreground truncate">{otherName}</p>
          </div>
        </div>

        {/* Listing banner — only shows if this conversation is tied to a listing */}
        {conv.listingId && (
          <Link
            to={`/listing/${conv.listingId}`}
            className="flex items-center gap-3 px-4 py-2.5 bg-accent/50 border-t border-border/30"
          >
            <div className="flex-1 min-w-0">
              <p className="font-jakarta text-xs font-semibold text-foreground truncate">View listing</p>
            </div>
            <span className="text-xs font-jakarta text-muted-foreground">View →</span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">👋</p>
            <p className="font-jakarta text-sm text-muted-foreground">Say hello to start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user.$id;
          return (
            <div key={msg.$id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm font-jakarta leading-relaxed ${
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] font-jakarta text-muted-foreground px-1">
                  {moment(msg.$createdAt).format("h:mm A")}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card/90 backdrop-blur-xl border-t border-border/50 px-4 py-3 pb-safe">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-muted rounded-2xl px-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-28"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
