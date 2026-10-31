import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, LoaderCircle, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_VALUES } from "../../../../shared/shop";
import { trpc } from "../../lib/trpc";
import { formatDate, formatRupees, todayString } from "../../lib/shop";

const pageSize = 20;
const paymentLabels = { unpaid: "Unpaid", partially_paid: "Part paid", paid: "Paid", refunded: "Refunded" } as const;
const nextStatuses: Record<(typeof ORDER_STATUS_VALUES)[number], Array<(typeof ORDER_STATUS_VALUES)[number]>> = {
  "Order Placed": ["Confirmed", "Cancelled"],
  Confirmed: ["Preparing", "Cancelled"],
  Preparing: ["Ready for Pickup / Out for Delivery", "Cancelled"],
  "Ready for Pickup / Out for Delivery": ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
};
export default function AdminOrders({ initialSearch = "", onPayments }: { initialSearch?: string; onPayments: () => void }) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<"" | (typeof ORDER_STATUS_VALUES)[number]>("");
  const [paymentStatus, setPaymentStatus] = useState<"" | "unpaid" | "partially_paid" | "paid" | "refunded">("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"" | "delivery" | "pickup">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const query = trpc.admin.ops.orderList.useQuery({ search: search || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined, fulfillmentMethod: fulfillmentMethod || undefined, startDate: startDate || undefined, endDate: endDate || undefined, page, pageSize }, { refetchInterval: 30000 });
  const details = trpc.admin.orderDetails.useQuery({ id: selected ?? 0 }, { enabled: selected !== null });
  const business = trpc.storefront.businessProfile.useQuery();
  const localToday = todayString(business.data?.timezone ?? "Asia/Kolkata");
  const utils = trpc.useUtils();
  const update = trpc.admin.ops.updateOrderStatus.useMutation();
  useEffect(() => setSearch(initialSearch), [initialSearch]);
  useEffect(() => setPage(1), [search, status, paymentStatus, fulfillmentMethod, startDate, endDate]);
  const setOrderStatus = async (id: number, next: (typeof ORDER_STATUS_VALUES)[number]) => {
    const current = query.data?.items.find(order => order.id === id);
    if (!current) return;
    if (!nextStatuses[current.status].includes(next)) { toast.error("That order-status transition is not allowed."); return; }
    let note: string | undefined;
    if (next === "Cancelled") {
      if (!window.confirm(`Cancel order ${current.orderCode}? This status is final.`)) return;
      note = window.prompt("Add a cancellation reason (at least 5 characters):")?.trim();
      if (!note || note.length < 5) { toast.error("A cancellation reason of at least 5 characters is required."); return; }
    }
    try {
      await update.mutateAsync({ id, status: next, note });
      await Promise.all([utils.admin.ops.orderList.invalidate(), utils.admin.orders.invalidate(), utils.admin.dashboard.invalidate(), utils.admin.orderDetails.invalidate(), utils.admin.ops.analytics.invalidate()]);
      toast.success(next === "Cancelled" ? "Order cancelled with a reason." : `Order moved to ${next}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Order status could not be updated."); }
  };
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  return <section className="admin-section admin-orders-page">
    <div className="admin-toolbar order-filters"><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order ID, customer or phone…" /></label><select className="admin-filter" value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="">All order states</option>{ORDER_STATUS_VALUES.map(value => <option key={value}>{value}</option>)}</select><select className="admin-filter" value={paymentStatus} onChange={event => setPaymentStatus(event.target.value as typeof paymentStatus)}><option value="">All payment states</option>{Object.entries(paymentLabels).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select><select className="admin-filter" value={fulfillmentMethod} onChange={event => setFulfillmentMethod(event.target.value as typeof fulfillmentMethod)}><option value="">Pickup & delivery</option><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select><label className="order-date-filter">From<input type="date" max={endDate || localToday} value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label className="order-date-filter">To<input type="date" min={startDate || undefined} max={localToday} value={endDate} onChange={event => setEndDate(event.target.value)} /></label></div>
    {query.error && <p className="form-error">{query.error.message}</p>}
    <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">FULFILMENT QUEUE</span><h2>The order <em>book.</em></h2></div><span className="table-count">{query.data?.total ?? 0} orders</span></div><div className="admin-table-wrap"><table className="admin-table order-admin-table"><thead><tr><th>ORDER / CUSTOMER</th><th>ITEMS</th><th>FULFILMENT</th><th>TOTAL / PAYMENT</th><th>STATE / ACTION</th><th /></tr></thead><tbody>{query.data?.items.map(order => <tr key={order.id}><td><button className="table-order-code" onClick={() => setSelected(order.id)}>{order.orderCode}</button><small>{order.customerName} · {order.customerPhone}</small><small>Placed {formatDate(order.createdAt)}</small></td><td>{order.items.map(item => <small key={item.id}>{item.productNameSnapshot}{item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ""} × {item.quantity}</small>)}</td><td><b>{order.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}</b><small>{formatDate(order.deliveryDate)} · {order.deliveryTime}</small><small>{order.fulfillmentMethod === "pickup" ? "At bakery" : order.deliveryAddress}</small></td><td><b>{formatRupees(order.totalPaise)}</b><small>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Pay at store"}</small><span className={`status-pill payment-${order.paymentStatus}`}>{paymentLabels[order.paymentStatus]}</span></td><td><span className="status-pill">{order.status}</span>{nextStatuses[order.status].length > 0 && <select className="status-select" aria-label={`Update ${order.orderCode} status`} value="" disabled={update.isPending} onChange={event => { const value = event.target.value; if (value) void setOrderStatus(order.id, value as (typeof ORDER_STATUS_VALUES)[number]); }}><option value="">Advance…</option>{nextStatuses[order.status].map(value => <option value={value} key={value}>{value}</option>)}</select>}</td><td><button className="view-detail" onClick={() => setSelected(order.id)}>Details <ArrowRight size={14} /></button></td></tr>)}</tbody></table>{query.isLoading && <div className="loading-state"><LoaderCircle className="spin" />Loading the order book…</div>}{!query.isLoading && !query.data?.items.length && <p className="table-empty muted-copy">No orders match those filters.</p>}</div><div className="admin-pagination"><span>Page {page} of {totalPages}</span><div><button className="button button-outline button-small" disabled={page <= 1 || query.isLoading} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14} /> Previous</button><button className="button button-outline button-small" disabled={page >= totalPages || query.isLoading} onClick={() => setPage(value => value + 1)}>Next <ArrowRight size={14} /></button></div></div></article>
    {selected !== null && <div className="admin-overlay" onClick={() => setSelected(null)}><section className="order-detail-drawer" role="dialog" aria-modal="true" aria-label="Order details" onClick={event => event.stopPropagation()}><button className="icon-circle drawer-close no-print" onClick={() => setSelected(null)} aria-label="Close order details"><X size={17} /></button>{details.isLoading ? <div className="loading-state"><LoaderCircle className="spin" />Loading saved order…</div> : details.data && <><div className="print-order-sheet"><div className="receipt-heading"><span className="eyebrow">CAKERS & CAKERS · KITCHEN COPY</span><h2>{details.data.orderCode}</h2><p>{details.data.customerName} · {details.data.customerPhone}{details.data.customerEmail ? ` · ${details.data.customerEmail}` : ""}</p></div><div className="detail-drawer-grid"><span>Placed</span><b>{formatDate(details.data.createdAt)}</b><span>Fulfilment</span><b>{details.data.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}</b><span>Requested</span><b>{formatDate(details.data.deliveryDate)} · {details.data.deliveryTime}</b><span>Delivery / pickup</span><b>{details.data.deliveryAddress}</b><span>Payment</span><b>{details.data.paymentMethod === "cod" ? "Cash on Delivery" : "Pay at store"} · {paymentLabels[details.data.paymentStatus]}</b><span>Kitchen note</span><b>{details.data.instructions || "—"}</b></div><h3>Items & saved prices</h3>{details.data.items.map(item => <div className="drawer-item" key={item.id}><span>{item.productNameSnapshot}{item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ""} × {item.quantity}</span><b>{formatRupees(item.lineTotalPaise)}</b></div>)}<div className="drawer-total">Subtotal <b>{formatRupees(details.data.subtotalPaise)}</b></div><div className="drawer-total">Fulfilment fee <b>{details.data.deliveryFeePaise ? formatRupees(details.data.deliveryFeePaise) : "No fee"}</b></div><div className="drawer-total">Order total <b>{formatRupees(details.data.totalPaise)}</b></div></div><div className="no-print order-detail-actions"><button className="button button-outline button-small" onClick={() => window.print()}><Printer size={15} /> Print kitchen copy</button><button className="button button-outline button-small" onClick={onPayments}><FileText size={15} /> Payment ledger</button></div><div className="no-print order-history"><h3>Status history</h3>{details.data.history.length ? details.data.history.map(record => <div className="history-line" key={record.id}><span className="history-dot" /><div><b>{record.toStatus}</b><small>{formatDate(record.createdAt)}{record.note ? ` · ${record.note}` : ""}</small></div></div>) : <p className="muted-copy">No status history is available for this older order.</p>}</div><div className="no-print"><h3>Recorded receipts & refunds</h3>{details.data.payments.length ? details.data.payments.map(record => <div className="drawer-item" key={record.id}><span>{record.kind} · {record.method.replaceAll("_", " ")} · {formatDate(record.createdAt)}{record.reference ? ` · ${record.reference}` : ""}</span><b>{record.kind === "refunded" ? "−" : "+"}{formatRupees(record.amountPaise)}</b></div>) : <p className="muted-copy">No payment has been recorded as received. The order is not marked paid.</p>}</div></>}</section></div>}
  </section>;
}
