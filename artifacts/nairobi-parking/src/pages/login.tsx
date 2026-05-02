import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const DEMO_USER_IDS = [1, 2, 3, 4, 5, 6];

function UserProfileCard({ userId }: { userId: number }) {
  const { data: user, isLoading } = useGetMe({ userId }, { query: { enabled: true, queryKey: getGetMeQueryKey({ userId }) } });
  const { login } = useCurrentUser();

  if (isLoading) return <Card className="animate-pulse h-24 bg-muted border-none" />;
  if (!user) return null;

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all border-border hover:border-primary"
      onClick={() => login(user.id, user.role)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold font-sans">{user.name}</h3>
            <Badge variant={user.role === 'owner' ? 'secondary' : 'default'} className="capitalize">
              {user.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {user.rating && (
              <span className="flex items-center gap-1 text-secondary font-medium">
                <Star className="h-3 w-3 fill-current" /> {user.rating.toFixed(1)}
              </span>
            )}
            <span>{user.email || user.phone}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Login() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-sans tracking-tight">Welcome to ParkEase</h1>
          <p className="text-muted-foreground">Select a demo persona to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_USER_IDS.map(id => (
            <UserProfileCard key={id} userId={id} />
          ))}
        </div>
      </div>
    </div>
  );
}