import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProductCard({ listing }) {
  return (
    <Link to={`/listing/${listing.$id}`} className="block active:scale-[0.98] transition-transform">
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
        <div className="aspect-square bg-muted">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-jakarta font-semibold text-sm text-foreground truncate">{listing.title}</h3>
          <p className="font-jakarta font-bold text-primary text-base mt-0.5">₵{listing.price?.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="text-[11px] font-jakarta truncate">{listing.location || "Ghana"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}