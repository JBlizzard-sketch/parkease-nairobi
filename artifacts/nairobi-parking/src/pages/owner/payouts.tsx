import { useListPayouts, getListPayoutsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, Clock, CheckCircle2, Download, DollarSign, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function OwnerPayouts() {
  const { userId } = useCurrentUser();
  const { toast } = useToast();

  const { data, isLoading } = useListPayouts(
    { ownerId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getListPayoutsQueryKey({ ownerId: userId ?? 0 }) } }
  );

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  const payouts = data?.payouts ?? [];
  const totalPaid = data?.totalPaid ?? 0;
  const totalPending = data?.totalPending ?? 0;
  const totalGross = payouts.reduce((s, p) => s + p.grossAmount, 0);
  const totalFees = payouts.reduce((s, p) => s + p.platformFee, 0);

  // Build monthly earnings chart data
  const monthlyMap: Record<string, number> = {};
  for (const p of payouts) {
    if (p.status === "paid") {
      const month = p.periodStart.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] ?? 0) + p.netAmount;
    }
  }
  const chartData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, earnings]) => ({
      month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(month.split("-")[1]) - 1],
      earnings,
    }));

  // Spot earnings breakdown
  const spotMap: Record<string, { earnings: number; count: number }> = {};
  for (const p of payouts) {
    if (!spotMap[p.spotTitle]) spotMap[p.spotTitle] = { earnings: 0, count: 0 };
    spotMap[p.spotTitle].earnings += p.netAmount;
    spotMap[p.spotTitle].count += 1;
  }
  const spotBreakdown = Object.entries(spotMap)
    .sort(([, a], [, b]) => b.earnings - a.earnings)
    .slice(0, 5);

  const handleRequestPayout = () => {
    toast({
      title: "Payout Requested",
      description: `KES ${totalPending.toLocaleString()} will be sent to your Mpesa within 24 hours.`,
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground mt-1">Your earnings after 15% platform fee</p>
        </div>
        {totalPending > 0 && (
          <Button className="gap-2" onClick={handleRequestPayout}>
            <ArrowUpRight className="h-4 w-4" />
            Request Payout
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-emerald-700">Total Paid</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-900" data-testid="text-total-paid">KES {totalPaid.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 mt-0.5">net after fees</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-700">Pending</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-900" data-testid="text-total-pending">KES {totalPending.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-0.5">awaiting release</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Gross Revenue</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">KES {totalGross.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">before platform fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Fees Paid</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">KES {totalFees.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">15% platform fee</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Monthly Earnings (Net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`KES ${val.toLocaleString()}`, "Net Earnings"]}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" fill="url(#earningsGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Spots by Earnings */}
      {spotBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-secondary" />
              Earnings by Spot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spotBreakdown.map(([title, { earnings, count }], i) => (
              <div key={title} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <span className="font-medium line-clamp-1">{title}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-bold">KES {earnings.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">({count} payouts)</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(earnings / (spotBreakdown[0]?.[1].earnings || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      )}

      {!isLoading && payouts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No payouts yet</p>
          <p className="text-sm mt-1">Earnings appear here once bookings are confirmed and paid</p>
        </div>
      )}

      {/* Payout History */}
      {payouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Payout History</h2>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => toast({ title: "CSV export coming soon!" })}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card key={payout.id} data-testid={`card-payout-${payout.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm line-clamp-1">{payout.spotTitle}</span>
                        <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[payout.status]}`} data-testid={`status-payout-${payout.id}`}>
                          {payout.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{payout.periodStart}</span>
                        {payout.mpesaCode && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">{payout.mpesaCode}</span>
                        )}
                        <span>Gross: KES {payout.grossAmount.toLocaleString()} · Fee: KES {payout.platformFee.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-primary" data-testid={`amount-payout-${payout.id}`}>
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
      )}
    </div>
  );
}
