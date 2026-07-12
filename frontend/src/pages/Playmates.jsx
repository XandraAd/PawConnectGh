import { useState, useEffect, useRef } from "react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, PawPrint, Sparkles, Dog } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Playmates() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDogs, setUserDogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  const initConversation = async () => {
    setLoading(true);
    try {
      // Check if there's an existing conversation
      const existingConversations = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        [
          Query.equal("type", "playmate_finder"),
          Query.orderDesc("$createdAt"),
          Query.limit(1)
        ]
      );

      let conv;
      if (existingConversations.documents.length > 0) {
        conv = existingConversations.documents[0];
        // Get messages for this conversation
        const messagesResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          [
            Query.equal("conversationId", conv.$id), // Using conversationId as in your schema
            Query.orderAsc("$createdAt")
          ]
        );
        setMessages(messagesResponse.documents);
      } else {
        // Create new conversation with the fields from your schema
        conv = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.CONVERSATIONS,
          ID.unique(),
          {
            type: "playmate_finder",
            name: "Playmate Finder",
            participantIds: [], // Array of participant IDs
            listingId: null, // Optional if linked to a listing
          }
        );
        setMessages([]);
      }
      
      setConversation(conv);
      
      // Fetch user's dogs
      await fetchUserDogs();
      
    } catch (error) {
      console.error("Error initializing conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDogs = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [
          Query.limit(10)
        ]
      );
      setUserDogs(response.documents);
    } catch (error) {
      console.error("Error fetching user dogs:", error);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !conversation) return;
    setSending(true);
    const msgContent = text.trim();
    setText("");

    try {
      // Save user message - using fields from your schema
      const userMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          conversationId: conversation.$id,
          role: "user",
          content: msgContent,
          senderId: "current_user_id", // Replace with actual user ID from auth
        }
      );
      
      setMessages(prev => [...prev, userMessage]);

      // Get AI response
      const aiResponse = await getAIResponse(msgContent, userDogs);
      
      // Save AI message
      const aiMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          conversationId: conversation.$id,
          role: "assistant",
          content: aiResponse,
          senderId: "ai_assistant",
        }
      );
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const getAIResponse = async (userMessage, dogs) => {
    // Create a context about available dogs
    const dogContext = dogs.length > 0 
      ? `Available dogs: ${dogs.map(d => d.name).join(', ')}` 
      : "No dogs registered yet";

    // Enhanced mock response based on user message
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes("find") || lowerMsg.includes("playmate")) {
      return `I can help find playmates for your dog! 🐾\n\n${dogContext}\n\nTell me more about what you're looking for:
- What breed is your dog?
- How old is your dog?
- What area are you in?
- Any specific preferences?`;
    } else if (lowerMsg.includes("near") || lowerMsg.includes("location")) {
      return "Great! I'll check for dogs in your area. 📍\n\nWhat city/region are you in?\n- Accra\n- Kumasi\n- Tema\n- Other locations";
    } else if (lowerMsg.includes("breed")) {
      return "Here are the breeds we have available:\n\n" + 
        dogs.map(d => `- ${d.breed || 'Unknown breed'}: ${d.name}`).join('\n') +
        "\n\nWhich breed are you interested in?";
    } else if (lowerMsg.includes("age") || lowerMsg.includes("old")) {
      return "Age is important for compatibility! 🐕\n\nWhat age range are you looking for?\n- Puppy (under 1 year)\n- Young adult (1-3 years)\n- Adult (3-7 years)\n- Senior (7+ years)";
    } else {
      return "I'm here to help you find the perfect playmate for your dog! 🐾\n\nTry asking me:\n- 'Find playmates for my dog'\n- 'Show me dogs nearby'\n- 'Looking for a specific breed'\n- 'Find dogs of similar age'";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-500 flex items-center justify-center shrink-0">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-jakarta font-bold text-sm text-foreground">Playmate Finder</p>
            <p className="font-jakarta text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              AI Dog Matchmaker
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Dog className="w-8 h-8 text-primary" />
            </div>
            <p className="font-jakarta font-bold text-base text-foreground mb-1">Find a Playmate! 🐾</p>
            <p className="font-jakarta text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Tell me about your dog (or pick one from your profile) and I'll find compatible playmates nearby!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Find playmates for my dog",
                "Show me dogs nearby",
                "Looking for a mate for breeding",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setText(suggestion);
                    setTimeout(() => handleSend(), 100);
                  }}
                  className="px-3 py-1.5 bg-accent rounded-full text-xs font-jakarta font-medium text-accent-foreground hover:bg-accent/70 active:scale-95 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages
          .filter((m) => m.role !== "system")
          .map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.$id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isUser && (
                    <div className="flex items-center gap-1 px-1">
                      <PawPrint className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-jakarta font-semibold text-primary">Playmate Finder</span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm font-jakarta leading-relaxed ${
                      isUser
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {isUser ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground"
                        components={{
                          a: ({ children, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card/90 backdrop-blur-xl border-t border-border/50 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your dog or ask for matches..."
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