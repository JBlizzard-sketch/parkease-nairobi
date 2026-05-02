import { useListPayouts, getListPayoutsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function OwnerPayouts() {
  const { userId } = useCurrentUser();

  const { data, isLoading } = useListPayouts(
    { ownerId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getListPayoutsQueryKey({ ownerId: userId ?? 0 }) } }
  );

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground mt-1">Your earnings after 15% platform fee</p>
      </div>

      {!isLoading && data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-emerald-700">Total Paid Out</p>
                <p className="text-2xl font-bold text-emerald-800" data-testid="text-total-paid">KES {data.totalPaid.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-800" data-testid="text-total-pending">KES {data.totalPending.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      )}

      {!isLoading && (!data?.payouts || data.payouts.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No payouts yet</p>
          <p className="text-sm mt-1">Earnings appear here once bookings are confirmed</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.payouts.map((payout) => (
          <Card key={payout.id} data-testid={`card-payout-${payout.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{payout.spotTitle}</span>
                    <Badge className={`text-xs border ${STATUS_COLORS[payout.status]}`} data-testid={`status-payout-${payout.id}`}>
                      {payout.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{payout.periodStart}</span>
                    {payout.mpesaCode && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{payout.mpesaCode}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Gross KES {payout.grossAmount.toLocaleString()} · Platform fee KES {payout.platformFee.toLocaleString()}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary" data-testid={`amount-payout-${payout.id}`}>
                    KES {payout.netAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">net</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
