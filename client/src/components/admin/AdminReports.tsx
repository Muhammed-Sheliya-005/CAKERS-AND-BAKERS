import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";
import { formatRupees } from "../../lib/shop";

function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function daysBefore(days: number) {
  const date = new Date(`${indiaToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  const safe = /^[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
function exportCsv(filename: string, rows: unknown[][]) {
  const content = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
const money = (value: number | undefined) => formatRupees(Number(value ?? 0));

export default function AdminReports() {
  const [startDate, setStartDate] = useState(() => daysBefore(29));
  const [endDate, setEndDate] = useState(indiaToday);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const query = trpc.admin.ops.analytics.useQuery({ startDate, endDate, granularity });
  const report = query.data;
  const trendRows = useMemo(() => (report?.trend ?? []).map(row => ({ ...row, salesRupees: row.grossPaise / 100 })), [report?.trend]);
  const download = () => {
    if (!report) return;
    exportCsv("cakers-sales-report.csv", [
      ["Cakers & Cakers — Sales report", `${startDate} to ${endDate}`],
      ["Date bucket", "Orders", "Gross sales (₹)"],
      ...report.trend.map(row => [row.date, row.orders, (row.grossPaise / 100).toFixed(2)]),
      [],
      ["Summary metric", "Value"],
      ["Total orders", report.summary.totalOrders],
      ["Completed orders", report.summary.completedOrders],
      ["Cancelled orders", report.summary.cancelledOrders],
      ["Gross order sales (₹)", (report.summary.grossSalesPaise / 100).toFixed(2)],
      ["Completed sales (₹)", (report.summary.completedSalesPaise / 100).toFixed(2)],
      ["Net collected (₹)", (report.summary.collectedPaise / 100).toFixed(2)],
      [],
      ["Best-selling cake", "Units", "Gross item value (₹)"],
      ...report.bestSellers.map(row => [row.variantName ? `${row.productName} (${row.variantName})` : row.productName, row.units, (row.grossPaise / 100).toFixed(2)]),
      [],
      ["Offline payment method", "Active received (₹)", "Active refunded (₹)", "Net collected excluding cancellations (₹)", "Cancelled received (excluded) (₹)", "Cancelled refunded (excluded) (₹)"],
      ...report.paymentBreakdown.map(row => [row.method, (row.receivedPaise / 100).toFixed(2), (row.refundedPaise / 100).toFixed(2), (row.netPaise / 100).toFixed(2), (row.cancelledReceivedPaise / 100).toFixed(2), (row.cancelledRefundedPaise / 100).toFixed(2)]),
    ]);
    toast.success("Report downloaded as CSV.");
  };
  return (
    <section className="admin-section admin-analytics-page">
      <div className="admin-toolbar report-toolbar">
        <label>From<input type="date" value={startDate} max={endDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label>To<input type="date" value={endDate} min={startDate} max={indiaToday()} onChange={event => setEndDate(event.target.value)} /></label>
        <label>Trend view<select value={granularity} onChange={event => setGranularity(event.target.value as typeof granularity)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <button className="button button-outline button-small" onClick={download} disabled={!report}><Download size={15} /> Export CSV</button>
      </div>
      {query.error && <p className="form-error">{query.error.message}</p>}
      {query.isLoading && <div className="loading-state"><LoaderCircle className="spin" /> Calculating saved shop records…</div>}
      {report && <>
        <div className="analytics-kpis">
          <article><span>Gross orders</span><strong>{money(report.summary.grossSalesPaise)}</strong><small>Non-cancelled order value</small></article>
          <article><span>Collected</span><strong>{money(report.summary.collectedPaise)}</strong><small>Recorded receipts less refunds</small></article>
          <article><span>Completed sales</span><strong>{money(report.summary.completedSalesPaise)}</strong><small>Delivered orders only</small></article>
          <article><span>Orders</span><strong>{report.summary.totalOrders}</strong><small>{report.summary.completedOrders} delivered · {report.summary.cancelledOrders} cancelled</small></article>
          <article><span>Awaiting confirmation</span><strong>{report.summary.awaitingConfirmation}</strong><small>{report.summary.preparingOrders} currently in preparation</small></article>
          <article><span>Unpaid / partial</span><strong>{report.summary.unpaidOrders}</strong><small>Open payment balances</small></article>
        </div>
        <div className="analytics-chart-grid">
          <article className="admin-panel analytics-chart-card">
            <div className="admin-panel-heading"><div><span className="eyebrow">ORDER VALUE</span><h2>Sales <em>over time.</em></h2></div></div>
            {trendRows.length ? <div className="analytics-chart"><ResponsiveContainer width="100%" height={280}><LineChart data={trendRows} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="4 5" stroke="#eadfd7" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8e7d75" }} /><YAxis tick={{ fontSize: 11, fill: "#8e7d75" }} tickFormatter={value => `₹${value}`} width={58} /><Tooltip formatter={(value: number) => [formatRupees(value * 100), "Gross sales"]} /><Line type="monotone" dataKey="salesRupees" stroke="#bd5a70" strokeWidth={3} dot={{ r: 3, fill: "#bd5a70" }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <p className="table-empty muted-copy">No orders in this date range yet. Saved sales will appear here.</p>}
          </article>
          <article className="admin-panel analytics-chart-card">
            <div className="admin-panel-heading"><div><span className="eyebrow">ORDER VOLUME</span><h2>Orders <em>by period.</em></h2></div></div>
            {trendRows.length ? <div className="analytics-chart"><ResponsiveContainer width="100%" height={280}><BarChart data={trendRows} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="4 5" stroke="#eadfd7" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8e7d75" }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8e7d75" }} /><Tooltip /><Bar dataKey="orders" name="Orders" fill="#ba9864" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="table-empty muted-copy">No order volume to chart yet.</p>}
          </article>
        </div>
        <div className="analytics-detail-grid">
          <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">MOST ORDERED</span><h2>Best-selling <em>cakes.</em></h2></div></div>{report.bestSellers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT / SIZE</th><th>UNITS</th><th>GROSS VALUE</th></tr></thead><tbody>{report.bestSellers.map((row, index) => <tr key={`${row.productName}-${row.variantName ?? "base"}`}><td><b>{index + 1}. {row.productName}</b>{row.variantName && <small>{row.variantName}</small>}</td><td>{row.units}</td><td>{money(row.grossPaise)}</td></tr>)}</tbody></table></div> : <p className="table-empty muted-copy">No completed order history for this range.</p>}</article>
          <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">ACTUAL OFFLINE LEDGER</span><h2>Payment <em>methods.</em></h2></div></div><p className="muted-copy">Collected totals exclude cancelled orders; their saved receipts and refunds remain visible below for reconciliation.</p>{report.paymentBreakdown.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>METHOD</th><th>ACTIVE RECEIVED</th><th>ACTIVE REFUNDED</th><th>NET COLLECTED</th><th>CANCELLED RECEIVED</th><th>CANCELLED REFUNDED</th></tr></thead><tbody>{report.paymentBreakdown.map(row => <tr key={row.method}><td>{row.method.replaceAll("_", " ")}</td><td>{money(row.receivedPaise)}</td><td>{money(row.refundedPaise)}</td><td><b>{money(row.netPaise)}</b></td><td>{money(row.cancelledReceivedPaise)}</td><td>{money(row.cancelledRefundedPaise)}</td></tr>)}</tbody></table></div> : <p className="table-empty muted-copy">No payment records have been recorded in this range.</p>}</article>
        </div>
        <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">WORKFLOW SNAPSHOT</span><h2>Order status <em>breakdown.</em></h2></div></div>{report.statusBreakdown.length ? <div className="status-breakdown">{report.statusBreakdown.map(row => <div key={row.status}><span>{row.status}</span><b>{row.orders}</b><div className="status-meter"><i style={{ width: `${Math.max(3, report.summary.totalOrders ? (row.orders / report.summary.totalOrders) * 100 : 0)}%` }} /></div></div>)}</div> : <p className="table-empty muted-copy">No orders recorded yet.</p>}</article>
      </>}
    </section>
  );
}
