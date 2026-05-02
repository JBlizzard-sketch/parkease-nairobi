import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/main-layout";

import Home from "@/pages/home";
import MapExplorer from "@/pages/map-explorer";
import SpotDetail from "@/pages/spot-detail";
import BookingConfirmation from "@/pages/booking-confirmation";
import MyBookings from "@/pages/my-bookings";
import Waitlist from "@/pages/waitlist";
import Login from "@/pages/login";

import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";
import AdminAnalytics from "@/pages/admin";
import CommuterDashboard from "@/pages/commuter-dashboard";
import OwnerDashboard from "@/pages/owner/dashboard";
import OwnerSpots from "@/pages/owner/spots";
import OwnerNewSpot from "@/pages/owner/new-spot";
import OwnerEditSpot from "@/pages/owner/edit-spot";
import OwnerBookings from "@/pages/owner/bookings";
import OwnerPayouts from "@/pages/owner/payouts";
import SavedSpots from "@/pages/saved-spots";
import OwnerProfile from "@/pages/owner-profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/map" component={MapExplorer} />
        <Route path="/spots/:id" component={SpotDetail} />
        <Route path="/book/:bookingId" component={BookingConfirmation} />
        <Route path="/bookings" component={MyBookings} />
        <Route path="/waitlist" component={Waitlist} />
        <Route path="/login" component={Login} />
        <Route path="/profile" component={Profile} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/dashboard" component={CommuterDashboard} />
        <Route path="/admin" component={AdminAnalytics} />
        <Route path="/saved" component={SavedSpots} />
        <Route path="/owner-profile/:ownerId" component={OwnerProfile} />

        <Route path="/owner/dashboard" component={OwnerDashboard} />
        <Route path="/owner/spots" component={OwnerSpots} />
        <Route path="/owner/spots/new" component={OwnerNewSpot} />
        <Route path="/owner/spots/:id/edit" component={OwnerEditSpot} />
        <Route path="/owner/bookings" component={OwnerBookings} />
        <Route path="/owner/payouts" component={OwnerPayouts} />

        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
