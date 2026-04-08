"use client";

import { useDashboard } from "@/hooks/use-api";
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
} from "recharts";
import {
  Package,
  Truck,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Boxes,
  BarChart3,
  Wallet,
  Store,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "red" | "purple" | "orange" | "yellow";
  trend?: { value: string; positive: boolean };
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
            {trend && (
              <p className={`text-xs font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}>
                {trend.positive ? "▲" : "▼"} {trend.value}
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 14 }).map((_, i) => (
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

  const profitMargin = stats?.totalRevenue > 0
    ? ((parseFloat(stats.totalProfit) / parseFloat(stats.totalRevenue)) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* KPI Grid — Financial */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sales & Profit</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats?.totalRevenue)}
            subtitle={`${stats?.orderCount ?? 0} delivered orders`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Total Profit"
            value={formatCurrency(stats?.totalProfit)}
            subtitle={`${profitMargin}% margin`}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Total Delivered Orders"
            value={formatNumber(stats?.orderCount ?? 0)}
            subtitle="Completed orders"
            icon={ShoppingCart}
            color="green"
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(stats?.inventoryValue)}
            subtitle={stats?.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : "All stocked"}
            icon={Boxes}
            color={stats?.lowStockCount > 0 ? "red" : "purple"}
          />
        </div>
      </div>

      {/* KPI Grid — Inventory & Expenses */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventory & Expenses</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Expected Inventory Profit"
            value={formatCurrency(stats?.expectedInventoryProfit)}
            subtitle="Based on selling vs base price"
            icon={ArrowUpRight}
            color="green"
          />
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

      {/* KPI Grid — Counts */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Products"
            value={formatNumber(stats?.productCount)}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="Suppliers"
            value={formatNumber(stats?.supplierCount)}
            icon={Truck}
            color="purple"
          />
          <StatCard
            title="Customers"
            value={formatNumber(stats?.customerCount)}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Categories"
            value={formatNumber(stats?.categoryCount)}
            icon={BarChart3}
            color="orange"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.categoryAnalytics?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.categoryAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="categoryName"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
                      <Badge
                        variant={
                          order.status === "delivered"
                            ? "success"
                            : order.status === "cancelled"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                No orders yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning */}
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
