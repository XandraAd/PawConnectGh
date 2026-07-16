import { useState, useEffect, useRef } from "react";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwriteClient";
import { Query, ID } from "appwrite";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Send, PawPrint, Sparkles, MapPin, Heart } from "lucide-react";

let idCounter = 0;
const nextId = () => `local_${Date.now()}_${idCounter++}`;

export default function Playmates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]); // chat is local/ephemeral
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myDogs, setMyDogs] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set()); // targetPetIds already requested this session
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user) fetchMyDogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchMyDogs = async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [Query.equal('ownerId', user.$id), Query.limit(20)]
      );
      setMyDogs(response.documents);

      if (response.documents.length > 0) {
        setMessages([{
          $id: nextId(),
          role: "assistant",
          kind: "dog-picker",
          content: "Which of your pets are you finding a playmate for?",
        }]);
      } else {
        setMessages([{
          $id: nextId(),
          role: "assistant",
          kind: "text",
          content: "You don't have any pets added yet! Add one first, then come back and I'll help find compatible playmates. 🐾",
        }]);
      }
    } catch (error) {
      console.error("Error fetching your pets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Core matching logic: same species + same region, then ranks by size match
  // and whether the candidate's friendlyWith mentions the right compatibility.
  const findMatches = async (myDog) => {
    try {
      const { documents: candidates } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PETS,
        [
          Query.equal('species', myDog.species),
          Query.equal('location', myDog.location || ''),
          Query.equal('isSearchable', true),
          Query.notEqual('ownerId', user.$id),
          Query.limit(25),
        ]
      );

      const scored = candidates.map((c) => {
        let score = 0;
        if (myDog.size && c.size === myDog.size) score += 2;
        const friendly = (c.friendlyWith || '').toLowerCase();
        if (friendly.includes(myDog.species?.toLowerCase())) score += 2;
        if (friendly.includes('dog') || friendly.includes('cat')) score += 1;
        return { ...c, _score: score };
      });

      scored.sort((a, b) => b._score - a._score);
      return scored.slice(0, 5);
    } catch (error) {
      console.error("Error finding matches:", error);
      return [];
    }
  };

  const handleSelectDog = async (dog) => {
    setMessages((prev) => [
      ...prev,
      { $id: nextId(), role: "user", kind: "text", content: `Find playmates for ${dog.name}` },
    ]);
    setSending(true);

    const matches = await findMatches(dog);

    if (matches.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          $id: nextId(),
          role: "assistant",
          kind: "text",
          content: `I couldn't find any compatible ${dog.species}s near ${dog.location || 'your area'} right now. Try checking back later as more pets get added!`,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          $id: nextId(),
          role: "assistant",
          kind: "matches",
          content: `Found ${matches.length} compatible playmate${matches.length > 1 ? 's' : ''} for ${dog.name}! 🐾`,
          matches,
          myDog: dog,
        },
      ]);
    }
    setSending(false);
  };

  const handleSendRequest = async (targetPet, myDog) => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYDATE_REQUESTS,
        ID.unique(),
        {
          requesterPetId: myDog.$id,
          targetPetId: targetPet.$id,
          status: 'pending',
          message: `${myDog.name}'s owner would like to set up a playdate!`,
        }
      );
      setSentRequests((prev) => new Set(prev).add(targetPet.$id));
    } catch (error) {
      console.error("Error sending playdate request:", error);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msgContent = text.trim();
    setText("");

    setMessages((prev) => [...prev, { $id: nextId(), role: "user", kind: "text", content: msgContent }]);

    setMessages((prev) => [
      ...prev,
      {
        $id: nextId(),
        role: "assistant",
        kind: "text",
        content: "You can pick one of your pets above and I'll search for compatible playmates based on species, location, and size. 🐾",
      },
    ]);
    setSending(false);
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
              Matched by size, location & temperament
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.$id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
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
                  {msg.content}
                </div>

                {msg.kind === "dog-picker" && (
                  <div className="flex flex-wrap gap-2">
                    {myDogs.map((dog) => (
                      <button
                        key={dog.$id}
                        onClick={() => handleSelectDog(dog)}
                        disabled={sending}
                        className="px-3 py-1.5 bg-accent rounded-full text-xs font-jakarta font-medium text-accent-foreground hover:bg-accent/70 active:scale-95 transition-all disabled:opacity-50"
                      >
                        🐾 {dog.name}
                      </button>
                    ))}
                  </div>
                )}

                {msg.kind === "matches" && (
                  <div className="space-y-2 w-full">
                    {msg.matches.map((pet) => (
                      <div key={pet.$id} className="bg-card border border-border/50 rounded-2xl p-3 flex gap-3">
                        <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                          {pet.photoUrl ? (
                            <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🐕</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-jakarta font-semibold text-sm">{pet.name}</p>
                          <p className="text-xs font-jakarta text-muted-foreground">{pet.breed || pet.species}</p>
                          <div className="flex items-center gap-1 text-[11px] font-jakarta text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {pet.location || "Unknown"}
                            {pet.size && <span>· {pet.size}</span>}
                          </div>
                          <button
                            onClick={() => handleSendRequest(pet, msg.myDog)}
                            disabled={sentRequests.has(pet.$id)}
                            className="mt-2 flex items-center gap-1 text-xs font-jakarta font-semibold text-primary disabled:text-muted-foreground disabled:cursor-default"
                          >
                            <Heart className={`w-3.5 h-3.5 ${sentRequests.has(pet.$id) ? '' : 'fill-primary'}`} />
                            {sentRequests.has(pet.$id) ? "Request sent!" : "Send playdate request"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-2xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card/90 backdrop-blur-xl border-t border-border/50 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
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
