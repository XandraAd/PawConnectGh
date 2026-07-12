import { useState, useEffect, useRef } from "react";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, MapPin } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

export default function ConversationChat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      // Get current user
      const currentUser = await account.get();
      setUser(currentUser);

      // Get conversation
      const conversation = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        conversationId
      );
      setConv(conversation);

      // Get messages for this conversation
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

      // Mark messages as read
      await markMessagesAsRead(conversation, currentUser);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (conversation, currentUser) => {
    try {
      // Update the conversation to mark messages as read
      // You can either update the conversation document or create a read receipt system
      // For simplicity, we'll update the conversation
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        conversation.$id,
        {
          lastReadAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Real-time subscription (using Appwrite Realtime)
  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to new messages
    const unsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response) => {
        if (response.payload && response.payload.conversationId === conversationId) {
          // Check if message already exists
          setMessages(prev => {
            if (prev.find(m => m.$id === response.payload.$id)) {
              return prev;
            }
            // Only add if it's not from the current user (to avoid duplicates)
            if (response.payload.senderId === user?.$id) {
              return prev;
            }
            return [...prev, response.payload];
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
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
      // Create message
      const newMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          conversationId: conversationId,
          senderId: user.$id,
          senderName: user.name || "User",
          content: msgText,
          role: "user",
        }
      );

      // Add to messages list
      setMessages(prev => [...prev, newMessage]);

      // Update conversation with last message
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        conversationId,
        {
          lastMessage: msgText,
          lastMessageAt: new Date().toISOString(),
        }
      );

      // Update local conversation state
      setConv(prev => ({ ...prev, lastMessage: msgText }));
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

  // Get other participant's name
  const getOtherParticipantName = () => {
    if (!conv || !user) return "User";
    const otherId = conv.participantIds?.find(id => id !== user.$id);
    // You could fetch the participant's profile here
    // For now, return a placeholder
    return otherId || "User";
  };

  if (loading || !conv || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const otherName = getOtherParticipantName();

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
            <p className="font-jakarta text-[11px] text-muted-foreground truncate">Re: {conv.listingTitle || "Listing"}</p>
          </div>
          {conv.listingImage && (
            <Link to={`/listing/${conv.listingId}`}>
              <img
                src={conv.listingImage}
                alt={conv.listingTitle || "Listing"}
                className="w-10 h-10 rounded-xl object-cover border border-border/50 shrink-0"
              />
            </Link>
          )}
        </div>

        {/* Listing banner */}
        {conv.listingId && (
          <Link 
            to={`/listing/${conv.listingId}`} 
            className="flex items-center gap-3 px-4 py-2.5 bg-accent/50 border-t border-border/30"
          >
            <div className="flex-1 min-w-0">
              <p className="font-jakarta text-xs font-semibold text-foreground truncate">{conv.listingTitle || "Listing"}</p>
              {conv.listingPrice && (
                <p className="font-jakarta text-xs text-primary font-bold">₵{conv.listingPrice?.toLocaleString()}</p>
              )}
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
        {messages
          .filter(msg => msg.role !== "system")
          .map((msg) => {
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
