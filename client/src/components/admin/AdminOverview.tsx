import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CakeSlice, Check, LoaderCircle, MessageCircle, PackageCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "../../lib/trpc";
import { formatDate, formatRupees } from "../../lib/shop";

function indiaToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function daysBefore(days: number) { const value = new Date(`${indiaToday()}T00:00:00Z`); value.setUTCDate(value.getUTCDate() - days); return value.toISOString().slice(0, 10); }
export default function AdminOverview({ onViewOrders }: { onViewOrders: () => void }) {
  const startDate = useMemo(() => daysBefore(29), []);
  const endDate = useMemo(indiaToday, []);
  const data = trpc.admin.ops.analytics.useQuery({ startDate, endDate, granularity: "daily" }, { refetchInterval: 30000 });
  const latest = trpc.admin.ops.orderList.useQuery({ page: 1, pageSize: 7 }, { refetchInterval: 30000 });
  const alerts = trpc.admin.ops.notifications.useQuery(undefined, { refetchInterval: 30000 });
  const productCount = trpc.admin.products.useQuery({});
  const summary = data.data?.summary;
  const cards = summary ? [
    { label: "Orders this month", value: String(summary.totalOrders), hint: `${summary.awaitingConfirmation} awaiting confirmation`, icon: ShoppingBag, tone: "rose" },
    { label: "In the kitchen", value: String(summary.openOrders), hint: `${summary.preparingOrders} preparing · ${summary.readyOrders} ready`, icon: PackageCheck, tone: "gold" },
    { label: "Completed sales", value: formatRupees(summary.completedSalesPaise), hint: `${summary.completedOrders} delivered orders`, icon: Check, tone: "green" },
    { label: "Payments collected", value: formatRupees(summary.collectedPaise), hint: `${summary.unpaidOrders} unpaid / part paid`, icon: TrendingUp, tone: "chocolate" },
    { label: "Cakes in catalogue", value: String(productCount.data?.length ?? "—"), hint: "See product shelf", icon: CakeSlice, tone: "pink" },
    { label: "Unread workspace alerts", value: String((alerts.data ?? []).filter(item => !item.readAt).length), hint: "Orders, messages and stock", icon: MessageCircle, tone: "violet" },
  ] : [];
  const chartData = data.data?.trend.map(row => ({ date: row.date.slice(5), sales: row.grossPaise / 100 })) ?? [];
  return <div className="overview-content">
    <div className="admin-welcome"><div><span className="eyebrow">A FRESH LOOK AT THE COUNTER</span><h2>Good day, <em>bakery team.</em></h2><p>Every figure below is calculated from saved shop records.</p></div><div className="overview-date">{new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}</div></div>
    {data.error && <p className="form-error">{data.error.message}</p>}
    {data.isLoading ? <div className="loading-state"><LoaderCircle className="spin" />Opening the order book…</div> : <>
      <div className="summary-stat-grid">{cards.map(({ label, value, hint, icon: Icon, tone }) => <article className="summary-stat" key={label}><span className={`stat-icon stat-${tone}`}><Icon size={19} /></span><span className="stat-label">{label}</span><strong>{value}</strong><small>{hint}</small></article>)}</div>
      <div className="overview-middle-grid"><article className="admin-panel overview-trend"><div className="admin-panel-heading"><div><span className="eyebrow">LAST 30 DAYS · IST</span><h2>Sales at a <em>glance.</em></h2></div><Link className="view-detail" href="/admin?tab=reports">Full reports <ArrowRight size={14} /></Link></div>{chartData.length ? <div className="analytics-chart"><ResponsiveContainer width="100%" height={245}><BarChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="4 5" stroke="#eadfd7" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8e7d75" }} /><YAxis tick={{ fontSize: 10, fill: "#8e7d75" }} tickFormatter={value => `₹${value}`} width={55} /><Tooltip formatter={(value: number) => [formatRupees(value * 100), "Gross order value"]} /><Bar dataKey="sales" name="Gross order value" fill="#bd5a70" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="table-empty muted-copy">New orders will create a sales trend here.</p>}</article>
        <article className="admin-panel overview-actions"><div className="admin-panel-heading"><div><span className="eyebrow">WORK TO PICK UP</span><h2>Team <em>queue.</em></h2></div></div><Link href="/admin?tab=enquiries"><MessageCircle size={17} /><span>Website enquiries</span><b>{alerts.data?.filter(item => item.kind === "enquiry" && !item.readAt).length ?? 0}</b></Link><Link href="/admin?tab=custom-cakes"><CakeSlice size={17} /><span>Custom cake requests</span><b>{alerts.data?.filter(item => item.kind === "custom_enquiry" && !item.readAt).length ?? 0}</b></Link><Link href="/admin?tab=inventory"><PackageCheck size={17} /><span>Low-stock reminders</span><b>{alerts.data?.filter(item => item.kind === "low_stock").length ?? 0}</b></Link><button className="button button-primary button-small" onClick={onViewOrders}>Review order queue <ArrowRight size={14} /></button></article></div>
      <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">JUST SAVED</span><h2>Recent <em>orders.</em></h2></div><button className="view-detail" onClick={onViewOrders}>All orders <ArrowRight size={14} /></button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>FULFILMENT DATE</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{latest.data?.items.map(order => <tr key={order.id}><td><b>{order.orderCode}</b></td><td>{order.customerName}<small>{order.customerPhone}</small></td><td>{formatDate(order.deliveryDate)}</td><td>{formatRupees(order.totalPaise)}</td><td><span className="status-pill">{order.status}</span></td></tr>)}</tbody></table>{latest.isLoading && <div className="loading-state"><LoaderCircle className="spin" />Loading recent orders…</div>}{!latest.isLoading && !latest.data?.items.length && <p className="table-empty muted-copy">No orders have been placed yet.</p>}</div></article>
    </>}
  </div>;
}
