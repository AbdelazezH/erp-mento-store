"use client";

import { useState } from "react";
import { useDashboard, useBillStats, usePeriodProfit, useTrend } from "@/hooks/use-api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import {
  Package,
  Truck,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Boxes,
  BarChart3,
  Wallet,
  Store,
  Receipt,
  ArrowUpRight,
  Calculator,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BILL_TYPE_LABELS: Record<string, string> = {
  supplier_bill: "Supplier",
  other_expense: "Other Expense",
  operation_invoice: "Operations",
  packaging_invoice: "Packaging",
  shipping_invoice: "Shipping",
  devices_invoice: "Devices",
  website_invoice: "Website",
  advertising_bill: "Advertising",
};

const PAYER_COLORS = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#f97316",
];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "red" | "purple" | "orange" | "yellow";
}) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    yellow: "text-yellow-600 bg-yellow-50",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PeriodMetricCard ─────────────────────────────────────────────────────────

function PeriodMetricCard({
  label,
  value,
  subtitle,
  negative,
  colorClass,
}: {
  label: string;
  value: number;
  subtitle: string;
  negative?: boolean;
  colorClass: string;
}) {
  const display = negative ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value);
  return (
    <div className={`rounded-xl border p-4 min-w-[180px] flex-shrink-0 ${colorClass}`}>
      <p className="text-sm font-medium mb-2 opacity-80">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${negative ? "text-red-600" : value >= 0 ? "text-green-600" : "text-red-600"}`}>
        {display}
      </p>
      <p className="text-xs mt-1 opacity-60">{subtitle}</p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: billStatsData } = useBillStats();

  // Period Profit Analysis state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const { data: periodData, isLoading: periodLoading } = usePeriodProfit(selectedMonth, selectedYear);

  // Revenue & Profit Trend state
  const [trendGroupBy, setTrendGroupBy] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const defaultDateFrom = toDateStr(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  const defaultDateTo = toDateStr(now);
  const [trendDateFrom, setTrendDateFrom] = useState(defaultDateFrom);
  const [trendDateTo, setTrendDateTo] = useState(defaultDateTo);
  const { data: trendData, isLoading: trendLoading } = useTrend(trendGroupBy, trendDateFrom, trendDateTo);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data as any;

  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const trendChartData = trendData?.data ?? [];
  const categoryData = (stats?.categoryAnalytics ?? []).map((c: any) => ({
    ...c,
    revenue: parseFloat(c.revenue ?? 0),
    cost: parseFloat(c.cost ?? 0),
  }));
  const payerData = (billStatsData ?? []).map((p: any) => ({
    ...p,
    total: parseFloat(p.total ?? 0),
  }));
  const investData = (stats?.investmentByCategory ?? []).map((i: any) => ({
    label: BILL_TYPE_LABELS[i.billType] ?? i.billType,
    total: parseFloat(i.total ?? 0),
  }));
  const topProducts = stats?.topProducts ?? [];

  const period = periodData as any;

  return (
    <div className="space-y-8">

      {/* ── 1. Sales & Profit ──────────────────────────────────────────── */}
      <div>
        <SectionHeader>Sales &amp; Profit</SectionHeader>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Delivered Orders"
            value={formatNumber(stats?.orderCount ?? 0)}
            subtitle="Completed orders"
            icon={ShoppingCart}
            color="green"
          />
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats?.totalRevenue)}
            subtitle={`${stats?.orderCount ?? 0} delivered orders`}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Total Profit"
            value={formatCurrency(stats?.totalProfit)}
            subtitle={
              stats?.totalRevenue > 0
                ? `${((parseFloat(stats.totalProfit) / parseFloat(stats.totalRevenue)) * 100).toFixed(1)}% margin`
                : "No revenue yet"
            }
            icon={TrendingUp}
            color="green"
          />
        </div>
      </div>

      {/* ── 2. Inventory ───────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Inventory</SectionHeader>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Products"
            value={formatNumber(stats?.productCount)}
            subtitle={stats?.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : "All stocked"}
            icon={Package}
            color={stats?.lowStockCount > 0 ? "red" : "blue"}
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(stats?.inventoryValue)}
            subtitle="Current stock at cost"
            icon={Boxes}
            color="purple"
          />
          <StatCard
            title="Expected Inventory Profit"
            value={formatCurrency(stats?.expectedInventoryProfit)}
            subtitle="Based on selling vs base price"
            icon={ArrowUpRight}
            color="green"
          />
        </div>
      </div>

      {/* ── 3. Investments & Expenses ──────────────────────────────────── */}
      <div>
        <SectionHeader>Investments &amp; Expenses</SectionHeader>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Investment"
            value={formatCurrency(stats?.totalInvestment)}
            subtitle="All invoices ever"
            icon={Wallet}
            color="purple"
          />
          <StatCard
            title="Total Goods"
            value={formatCurrency(stats?.totalGoods)}
            subtitle="Supplier invoices only"
            icon={Store}
            color="orange"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats?.totalExpensesAllTime)}
            subtitle="Non-supplier invoices"
            icon={Receipt}
            color="red"
          />
        </div>
      </div>

      {/* ── 4. General Stats ───────────────────────────────────────────── */}
      <div>
        <SectionHeader>General Stats</SectionHeader>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCard title="Suppliers" value={formatNumber(stats?.supplierCount)} icon={Truck} color="purple" />
          <StatCard title="Customers" value={formatNumber(stats?.customerCount)} icon={Users} color="green" />
          <StatCard title="Categories" value={formatNumber(stats?.categoryCount)} icon={BarChart3} color="orange" />
        </div>
      </div>

      {/* ── 5. Period Profit Analysis ──────────────────────────────────── */}
      <div>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Period Profit Analysis</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue minus all costs, expenses &amp; offer spend</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[90px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {periodLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4 min-w-[180px] flex-shrink-0 bg-muted animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                <PeriodMetricCard
                  label="Sales Revenue"
                  value={period?.salesRevenue ?? 0}
                  subtitle="From orders"
                  colorClass="bg-blue-50 border-blue-100"
                />
                <PeriodMetricCard
                  label="Cost of Goods"
                  value={period?.costOfGoods ?? 0}
                  subtitle="Product costs"
                  negative
                  colorClass="bg-yellow-50 border-yellow-100"
                />
                <PeriodMetricCard
                  label="Operating Expenses"
                  value={period?.operatingExpenses ?? 0}
                  subtitle="Non-supplier invoices"
                  negative
                  colorClass="bg-orange-50 border-orange-100"
                />
                <PeriodMetricCard
                  label="Shipping Discounts"
                  value={period?.shippingDiscounts ?? 0}
                  subtitle="Waived shipping fees"
                  negative
                  colorClass="bg-purple-50 border-purple-100"
                />
                <PeriodMetricCard
                  label="Free Items Value"
                  value={period?.freeItemsValue ?? 0}
                  subtitle="Gifted product cost"
                  negative
                  colorClass="bg-rose-50 border-rose-100"
                />
                <PeriodMetricCard
                  label="True Net Profit"
                  value={period?.trueNetProfit ?? 0}
                  subtitle={`${period?.margin ?? "0"}% margin`}
                  colorClass="bg-gray-50 border-gray-200"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Revenue & Profit Trend + Category Performance ───────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue &amp; Profit Trend</CardTitle>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setTrendGroupBy(g)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    trendGroupBy === g
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="date"
                  value={trendDateFrom}
                  onChange={(e) => setTrendDateFrom(e.target.value)}
                  className="h-7 text-xs border rounded px-1.5 bg-background"
                />
                <span className="text-muted-foreground text-xs">–</span>
                <input
                  type="date"
                  value={trendDateTo}
                  onChange={(e) => setTrendDateTo(e.target.value)}
                  className="h-7 text-xs border rounded px-1.5 bg-background"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-[280px] bg-muted animate-pulse rounded" />
            ) : trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => [formatCurrency(value), name === "revenue" ? "Revenue" : "Profit"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend formatter={(v) => v === "revenue" ? "Revenue" : "Profit"} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => [formatCurrency(value), name === "revenue" ? "Revenue" : "Cost"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend formatter={(v) => v === "revenue" ? "Revenue" : "Cost"} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="cost" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 7. Spend by Payer ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Spend by Payer</CardTitle>
          <p className="text-xs text-muted-foreground">Total invoice amount per &ldquo;Paid By&rdquo; person</p>
        </CardHeader>
        <CardContent>
          {payerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payerData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="personName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), "Total Spend"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {payerData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PAYER_COLORS[index % PAYER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
              No payer data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 8. Investment by Category + Top Selling Products ───────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Investment by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Investment by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {investData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={investData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), "Investment"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
                No investment data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left pb-2 font-medium w-8">#</th>
                      <th className="text-left pb-2 font-medium">Product</th>
                      <th className="text-right pb-2 font-medium">Units</th>
                      <th className="text-right pb-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p: any, i: number) => (
                      <tr
                        key={i}
                        className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                      >
                        <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 font-medium">{p.productName}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatNumber(p.units)}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Low Stock Warning ─────────────────────────────────────────── */}
      {stats?.lowStockCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <div>
                <p className="font-medium text-orange-800">Low Stock Alert</p>
                <p className="text-sm text-orange-700">
                  {stats.lowStockCount} product{stats.lowStockCount !== 1 ? "s" : ""} have less than 10 units in stock.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
