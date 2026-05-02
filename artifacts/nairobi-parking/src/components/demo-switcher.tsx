import { useState } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

const ROLE_COLORS: Record<string, string> = {
  commuter: "bg-primary/10 text-primary border-primary/20",
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  both: "bg-blue-100 text-blue-800 border-blue-200",
  admin: "bg-purple-100 text-purple-800 border-purple-200",
};

function initials(name: string) {
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function DemoSwitcher() {
  const { userId, login } = useCurrentUser();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const q1 = useGetMe({ userId: 1 }, { query: { queryKey: getGetMeQueryKey({ userId: 1 }) } });
  const q2 = useGetMe({ userId: 2 }, { query: { queryKey: getGetMeQueryKey({ userId: 2 }) } });
  const q3 = useGetMe({ userId: 3 }, { query: { queryKey: getGetMeQueryKey({ userId: 3 }) } });
  const q4 = useGetMe({ userId: 4 }, { query: { queryKey: getGetMeQueryKey({ userId: 4 }) } });
  const q5 = useGetMe({ userId: 5 }, { query: { queryKey: getGetMeQueryKey({ userId: 5 }) } });
  const q6 = useGetMe({ userId: 6 }, { query: { queryKey: getGetMeQueryKey({ userId: 6 }) } });

  const users = [q1, q2, q3, q4, q5, q6]
    .map((q, i) => q.data ? { ...q.data, colorIdx: i } : null)
    .filter(Boolean) as Array<{ id: number; name: string; role: string; colorIdx: number }>;

  const currentUser = users.find((u) => u.id === userId);

  const handleSwitch = (id: number, role: string) => {
    login(id, role as any);
    setOpen(false);
    setLocation(role === "owner" ? "/owner/dashboard" : "/");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-sm font-medium transition-all",
              "bg-card/95 backdrop-blur-sm hover:shadow-xl hover:scale-105 active:scale-100",
              open ? "border-primary/40 shadow-primary/10" : "border-border"
            )}
            title="Switch demo persona"
          >
            {currentUser ? (
              <>
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className={`text-[10px] text-white font-bold ${AVATAR_COLORS[currentUser.colorIdx]}`}>
                    {initials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[90px] truncate">{currentUser.name.split(" ")[0]}</span>
                <Badge variant="outline" className={cn("text-[10px] py-0 h-4 px-1.5 border capitalize hidden sm:flex", ROLE_COLORS[currentUser.role])}>
                  {currentUser.role}
                </Badge>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Demo</span>
              </>
            )}
            <ChevronUp className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-72 p-3 shadow-xl"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Switch Demo Persona</p>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">6 accounts</span>
          </div>

          <div className="space-y-1">
            {users.map((user) => {
              const isCurrent = user.id === userId;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSwitch(user.id, user.role)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    isCurrent
                      ? "bg-primary/8 border border-primary/20"
                      : "hover:bg-muted border border-transparent"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={`text-xs text-white font-bold ${AVATAR_COLORS[user.colorIdx]}`}>
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isCurrent && "text-primary")}>{user.name}</p>
                    <Badge variant="outline" className={cn("text-[10px] py-0 h-4 px-1.5 border capitalize mt-0.5", ROLE_COLORS[user.role])}>
                      {user.role}
                    </Badge>
                  </div>
                  {isCurrent && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-3 pt-2 border-t border-border/50">
            Demo mode · No real data or payments
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
