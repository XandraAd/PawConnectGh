import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function NearYouBanner() {
  return (
    <Link to="/explore" className="block mx-4 my-3">
      <div className="bg-gradient-to-r from-primary to-red-500 rounded-2xl p-4 flex items-center gap-3 shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-jakarta font-bold text-white text-base">Dogs Near You</h3>
          <p className="font-jakarta text-white/80 text-xs mt-0.5">Discover dogs and breeders in your area</p>
        </div>
        <span className="text-white/60 text-xl">→</span>
      </div>
    </Link>
  );
}