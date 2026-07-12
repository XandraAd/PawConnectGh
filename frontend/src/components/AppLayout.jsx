import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return (
    <div className="font-jakarta max-w-[430px] mx-auto min-h-screen relative">
      <Outlet />
      <BottomNav />
    </div>
  );
}