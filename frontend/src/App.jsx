import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './lib/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from './pages/ResetPassword';
import CheckEmail from "./pages/CheckEmail";
import VerifyEmail from "./pages/VerifyEmail";
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import CreatePost from './pages/CreatePost';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import ListingDetail from './pages/ListingDetail';
import CreateListing from '@/pages/CreateListing';
import Messages from '@/pages/Messages';
import ConversationChat from '@/pages/ConversationChat';
import Playmates from '@/pages/Playmates';
import AddDog from "@/pages/AddDog";
import Settings from "@/pages/Settings";
import MyDogs from "@/pages/MyDogs";
import MyListings from "@/pages/MyListings";
import Breeders from "@/pages/Breeders";
import AdminPanel from "@/admin/pages/AdminPanel";
import PostDetail from "./pages/PostDetail";
import PageNotFound from "./pages/PageNotFound";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public routes — no login required */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="/listing/:listingId" element={<ListingDetail />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/conversation/:conversationId" element={<ConversationChat />} />
              <Route path="/playmates" element={<Playmates />} />
              <Route path="/add-dog" element={<AddDog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/edit-profile" element={<Settings />} /> {/* Optional: redirect to settings */}
              <Route path="/my-dogs" element={<MyDogs />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/breeders" element={<Breeders />} />
              <Route path="/post/:postId" element={<PostDetail />} />
            </Route>

            {/* Admin-only route — requires isAdmin: true on the user's profile,
                checked separately from ProtectedRoute (which only checks login) */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* Catch-all for unmatched URLs */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
