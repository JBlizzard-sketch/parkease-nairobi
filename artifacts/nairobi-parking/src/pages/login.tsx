import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Car, Home, Users, ArrowRight, Shield, MapPin, Bell, BarChart3, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

const DEMO_USER_IDS = [1, 2, 3, 4, 5, 6];

const ROLE_META: Record<string, { icon: React.ReactNode; desc: string; color: string }> = {
  commuter:  { icon: <Car className="h-3.5 w-3.5" />,    desc: "Books parking spots",        color: "bg-primary/10 text-primary border-primary/20" },
  owner:     { icon: <Home className="h-3.5 w-3.5" />,   desc: "Lists & manages spaces",     color: "bg-secondary/20 text-secondary-foreground border-secondary/30" },
  both:      { icon: <Users className="h-3.5 w-3.5" />,  desc: "Books & lists spots",        color: "bg-blue-100 text-blue-800 border-blue-200" },
  admin:     { icon: <Shield className="h-3.5 w-3.5" />, desc: "Platform analytics",         color: "bg-purple-100 text-purple-800 border-purple-200" },
};

const AVATAR_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

const DEMO_SCENARIOS = [
  {
    persona: "Commuter",
    icon: <Car className="h-4 w-4" />,
    color: "border-primary/20 bg-primary/5",
    titleColor: "text-primary",
    steps: [
      { icon: <MapPin className="h-3.5 w-3.5" />, text: 'Search "Westlands" on the map' },
      { icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: "Pick a spot & book with Mpesa" },
      { icon: <Star className="h-3.5 w-3.5" />, text: "Rate the space after parking" },
    ],
  },
  {
    persona: "Space Owner",
    icon: <Home className="h-4 w-4" />,
    color: "border-amber-200 bg-amber-50",
    titleColor: "text-amber-800",
    steps: [
      { icon: <Bell className="h-3.5 w-3.5" />, text: "Accept incoming booking requests" },
      { icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: "Mark completed stays as done" },
      { icon: <BarChart3 className="h-3.5 w-3.5" />, text: "Check your earnings & payouts" },
    ],
  },
  {
    persona: "Admin",
    icon: <Shield className="h-4 w-4" />,
    color: "border-purple-200 bg-purple-50",
    titleColor: "text-purple-800",
    steps: [
      { icon: <BarChart3 className="h-3.5 w-3.5" />, text: "View platform-wide analytics" },
      { icon: <Star className="h-3.5 w-3.5" />, text: "Monitor top spots & ratings" },
      { icon: <Bell className="h-3.5 w-3.5" />, text: "Trigger the surge pricing engine" },
    ],
  },
];

function UserProfileCard({ userId, index }: { userId: number; index: number }) {
  const { data: user, isLoading } = useGetMe({ userId }, { query: { enabled: true, queryKey: getGetMeQueryKey({ userId }) } });
  const { login } = useCurrentUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <Card className="animate-pulse h-24 bg-muted border-none" />;
  }
  if (!user) return null;

  const meta = ROLE_META[user.role] ?? ROLE_META.commuter;
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  const handleLogin = () => {
    login(user.id, user.role);
    setLocation(user.role === "owner" ? "/owner/dashboard" : "/");
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group"
      onClick={handleLogin}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className={`h-12 w-12 flex-shrink-0 border-2 border-white shadow-sm`}>
          <AvatarFallback className={`text-white font-bold text-sm ${avatarColor}`}>
            {user.name.charAt(0)}{user.name.split(" ")[1]?.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold truncate">{user.name}</h3>
            <Badge className={`text-xs border flex items-center gap-1 flex-shrink-0 ${meta.color}`}>
              {meta.icon}
              <span className="capitalize">{user.role}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {user.rating != null && (
              <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                <Star className="h-3 w-3 fill-current" /> {user.rating.toFixed(1)}
              </span>
            )}
            <span className="truncate">{user.email || user.phone}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 italic">{meta.desc}</p>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </CardContent>
    </Card>
  );
}

export default function Login() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo + headline */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold font-mono shadow-lg mx-auto">
            P
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to ParkEase</h1>
            <p className="text-muted-foreground mt-1">This is a demo — select a persona to explore the platform</p>
          </div>
        </div>

        {/* Demo Scenarios */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Try These Demo Flows</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map((scenario) => (
              <div key={scenario.persona} className={`rounded-xl border p-4 space-y-3 ${scenario.color}`}>
                <div className={`flex items-center gap-2 font-semibold text-sm ${scenario.titleColor}`}>
                  {scenario.icon}
                  {scenario.persona}
                </div>
                <ol className="space-y-1.5">
                  {scenario.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className={`flex-shrink-0 mt-0.5 ${scenario.titleColor} opacity-70`}>{step.icon}</span>
                      <span>{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* Persona cards */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Choose a Demo Persona</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_USER_IDS.map((id, i) => (
              <UserProfileCard key={id} userId={id} index={i} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No real accounts or payments — this is a fully simulated demo environment
        </p>
      </div>
    </div>
  );
}
