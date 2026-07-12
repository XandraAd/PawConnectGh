import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTIONS, account } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronRight } from "lucide-react";
import moment from "moment";

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Get current user
      const currentUser = await account.get();
      setUser(currentUser);

      // Get all conversations where user is a participant
      // Use Query.contains for array fields
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        [
          Query.contains("participantIds", currentUser.$id), // Fixed: use contains for arrays
          Query.orderDesc("$updatedAt"),
          Query.limit(100)
        ]
      );

      console.log("📋 Conversations found:", response.documents);

      // Get messages for each conversation to get last message
      const conversationsWithMessages = await Promise.all(
        response.documents.map(async (conv) => {
          const messagesResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MESSAGES,
            [
              Query.equal("conversationId", conv.$id),
              Query.orderDesc("$createdAt"),
              Query.limit(1)
            ]
          );

          const lastMessage = messagesResponse.documents[0] || null;
          
          // Get other participant info
          const otherParticipantId = conv.participantIds?.find(
            id => id !== currentUser.$id
          ) || null;

          // Get other participant's name (you can fetch from profiles if needed)
          let otherParticipantName = "User";
          if (otherParticipantId) {
            try {
              // Try to get profile
              const profileResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                [
                  Query.equal("userId", otherParticipantId),
                  Query.limit(1)
                ]
              );
              if (profileResponse.documents.length > 0) {
                otherParticipantName = profileResponse.documents[0].fullName || 
                                      profileResponse.documents[0].username || 
                                      "User";
              }
            } catch (error) {
              console.log("Could not fetch profile for:", otherParticipantId);
            }
          }

          return {
            ...conv,
            lastMessage: lastMessage?.content || null,
            lastMessageAt: lastMessage?.$createdAt || conv.$updatedAt,
            otherParticipantId: otherParticipantId,
            otherParticipantName: otherParticipantName,
          };
        })
      );

      // Sort by last message time
      conversationsWithMessages.sort((a, b) => 
        new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParty = (conv) => {
    if (!user) return "Unknown";
    return conv.otherParticipantName || "User";
  };

  const getUnread = (conv) => {
    // You'll need to implement unread tracking
    // For now, return 0
    return 0;
  };

  const getListingTitle = (conv) => {
    return conv.listingTitle || "Listing";
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
        <div className="max-w-[430px] mx-auto px-4 py-3">
          <h1 className="font-jakarta font-bold text-lg text-foreground">Messages</h1>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="font-jakarta font-semibold text-foreground text-base">No messages yet</p>
            <p className="font-jakarta text-sm text-muted-foreground mt-1">
              When you contact a seller or someone messages you about your listing, it'll appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {conversations.map((conv) => {
              const unread = getUnread(conv);
              return (
                <button
                  key={conv.$id}
                  onClick={() => navigate(`/conversation/${conv.$id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-jakarta font-bold text-lg">
                      {getOtherParty(conv)?.[0]?.toUpperCase() || "?"}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-jakarta font-bold">
                        {unread}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`font-jakarta text-sm truncate ${unread > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                        {getOtherParty(conv)}
                      </p>
                      <span className="text-[11px] font-jakarta text-muted-foreground shrink-0 ml-2">
                        {conv.lastMessageAt ? moment(conv.lastMessageAt).fromNow() : ""}
                      </span>
                    </div>
                    <p className="text-xs font-jakarta text-primary/70 font-medium truncate mb-0.5">
                      🛒 {getListingTitle(conv)}
                    </p>
                    <p className={`text-xs font-jakarta truncate ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.lastMessage || "Start a conversation"}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}