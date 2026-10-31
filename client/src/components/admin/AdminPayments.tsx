import { useState } from "react";
import { LoaderCircle, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";
import { formatDate, formatRupees } from "../../lib/shop";

type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "cod" | "pay_at_store";
const methodLabel: Record<PaymentMethod, string> = { cash: "Cash", upi: "UPI (manually confirmed)", card: "Card (manually confirmed)", bank_transfer: "Bank transfer (manually confirmed)", cod: "Cash on delivery", pay_at_store: "Pay at store" };

export default function AdminPayments() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"received" | "refunded" | "">("");
  const [orderId, setOrderId] = useState("");
  const [entryKind, setEntryKind] = useState<"received" | "refunded">("received");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const query = trpc.admin.ops.payments.useQuery({ search: search || undefined, kind: kind || undefined, page: 1, pageSize: 100 }, { refetchInterval: 30000 });
  const orders = trpc.admin.orders.useQuery({});
  const utils = trpc.useUtils();
  const save = trpc.admin.ops.recordPayment.useMutation();
  const selectedOrder = orders.data?.find(order => order.id === Number(orderId));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number(orderId)) { toast.error("Select an order before recording a payment."); return; }
    try {
      await save.mutateAsync({ orderId: Number(orderId), kind: entryKind, method, amountRupees: Number(amount), reference: reference || undefined, notes: notes || undefined });
      await Promise.all([utils.admin.ops.payments.invalidate(), utils.admin.ops.analytics.invalidate(), utils.admin.orders.invalidate(), utils.admin.orderDetails.invalidate()]);
      toast.success(entryKind === "received" ? "Offline receipt recorded against the order." : "Refund recorded against the order.");
      setAmount(""); setReference(""); setNotes("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Payment record could not be saved."); }
  };
  return (
    <section className="admin-section admin-payment-page">
      <div className="payment-ledger-note"><b>Honest payment records</b><span>This ledger records payments or refunds that bakery staff have actually confirmed. It does not process online charges or simulate a gateway.</span></div>
      <div className="payment-page-layout">
        <form className="admin-panel payment-entry" onSubmit={submit}>
          <div className="admin-panel-heading"><div><span className="eyebrow">OFFLINE LEDGER</span><h2>Record a <em>payment.</em></h2></div></div>
          <label>Order<select required value={orderId} onChange={event => setOrderId(event.target.value)}><option value="">Choose an order</option>{orders.data?.map(order => <option value={order.id} key={order.id} disabled={order.status === "Cancelled" && entryKind !== "refunded"}>{order.orderCode} · {order.customerName} · {formatRupees(order.totalPaise)}{order.status === "Cancelled" ? " · cancelled (refund only)" : ""}</option>)}</select></label>
          {selectedOrder && <div className="payment-order-hint">Order status: <b>{selectedOrder.status}</b> · payment {selectedOrder.paymentStatus} · total {formatRupees(selectedOrder.totalPaise)}</div>}
          <div className="form-grid"><label>Entry type<select value={entryKind} onChange={event => setEntryKind(event.target.value as typeof entryKind)}><option value="received">Payment received</option><option value="refunded">Refund issued</option></select></label><label>Confirmed method<select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>{Object.entries(methodLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Amount (₹)<input required type="number" min="0.01" step="0.01" max="200000" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Reference (optional)<input maxLength={120} value={reference} onChange={event => setReference(event.target.value)} placeholder="Receipt, transfer reference…" /></label><label className="full-span">Staff note (optional)<textarea maxLength={500} rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Record a useful internal payment note" /></label></div>
          <p className="muted-copy">Receipts are limited to the outstanding balance and are disabled for cancelled orders. Record a refund only after money was actually returned; refunds cannot exceed confirmed receipts.</p>
          <button className="button button-primary button-small" disabled={save.isPending || !selectedOrder}>{save.isPending ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Save confirmed entry</button>
        </form>
        <article className="admin-panel payment-ledger">
          <div className="admin-panel-heading"><div><span className="eyebrow">SAVED TRANSACTIONS</span><h2>The payment <em>book.</em></h2></div><span className="table-count">{query.data?.length ?? 0} records</span></div>
          <div className="admin-toolbar"><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or customer…" /></label><select className="admin-filter" value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="">Receipts & refunds</option><option value="received">Receipts only</option><option value="refunded">Refunds only</option></select></div>
          {query.error && <p className="form-error">{query.error.message}</p>}
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>WHEN / ORDER</th><th>CUSTOMER</th><th>ENTRY</th><th>METHOD</th><th>AMOUNT</th><th>REFERENCE / NOTE</th></tr></thead><tbody>{query.data?.map(row => <tr key={row.payment.id}><td>{formatDate(row.payment.createdAt)}<small>{row.orderCode}</small></td><td>{row.customerName}<small>{row.customerPhone}</small></td><td><span className={`status-pill ${row.payment.kind === "refunded" ? "status-cancelled" : "status-delivered"}`}>{row.payment.kind}</span></td><td>{methodLabel[row.payment.method]}</td><td><b>{row.payment.kind === "refunded" ? "−" : "+"}{formatRupees(row.payment.amountPaise)}</b></td><td>{row.payment.reference || "—"}<small>{row.payment.notes || "No staff note"}</small></td></tr>)}</tbody></table>{query.isLoading && <div className="loading-state"><LoaderCircle className="spin" /> Loading saved receipts…</div>}{!query.isLoading && !query.data?.length && <p className="table-empty muted-copy">Confirmed receipts and refunds will appear here after staff records them.</p>}</div>
        </article>
      </div>
    </section>
  );
}
