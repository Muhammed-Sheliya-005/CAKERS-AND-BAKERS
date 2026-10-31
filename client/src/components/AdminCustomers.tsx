import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Save, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { formatDate, formatRupees } from "../lib/shop";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const query = trpc.admin.customers.useQuery({ search: search || undefined });
  const history = trpc.admin.ops.customerHistory.useQuery({ userId: selectedId ?? 0 }, { enabled: selectedId !== null });
  const utils = trpc.useUtils();
  const saveNotes = trpc.admin.ops.updateCustomerNotes.useMutation();
  useEffect(() => { setNotes(history.data?.customer.adminNotes ?? ""); }, [history.data?.customer.adminNotes, selectedId]);
  const submitNotes = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedId === null) return;
    try { await saveNotes.mutateAsync({ userId: selectedId, notes }); await Promise.all([utils.admin.ops.customerHistory.invalidate(), utils.admin.customers.invalidate()]); toast.success("Private customer note saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Private note could not be saved."); }
  };
  return <section className="admin-panel admin-customers-panel">
    <div className="admin-toolbar admin-customers-toolbar"><div className="admin-toolbar-note"><span className="eyebrow">REGISTERED SHOP ACCOUNTS</span><p>Contact and order information is visible to authorised bakery staff only.</p></div><label className="admin-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find by name, email or phone…" /></label></div>
    <div className="admin-panel-heading"><div><span className="eyebrow">THE PEOPLE WHO LOVE CAKE</span><h2>Your <em>customers.</em></h2></div><span className="table-count">{query.data?.length ?? 0} accounts</span></div>
    {query.error && <p className="form-error">{query.error.message}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>ORDERS</th><th>COMPLETED SALES</th><th>MOST RECENT ORDER</th><th>HISTORY / NOTES</th></tr></thead><tbody>{query.data?.map(customer => <tr key={customer.id}><td><b className="customer-table-name">{customer.name || "Cake-shop customer"}</b><small>Account since {formatDate(customer.createdAt)}</small></td><td>{customer.email || "—"}<small>{customer.phone || "Phone not saved"}</small></td><td>{customer.orderCount}</td><td>{formatRupees(customer.orderValuePaise)}</td><td>{customer.recentOrderAt ? formatDate(customer.recentOrderAt) : "No orders yet"}</td><td><button className="view-detail" onClick={() => setSelectedId(customer.id)}>Open record <ArrowRight size={14} /></button>{customer.adminNotes && <small>Private note saved</small>}</td></tr>)}</tbody></table>{query.isLoading && <div className="loading-state"><LoaderCircle className="spin" />Finding customer records…</div>}{!query.isLoading && !query.data?.length && <div className="customers-empty"><Users size={24} /><span>{search ? "No customer accounts match that search." : "No customer accounts have signed in yet."}</span></div>}</div>
    {selectedId !== null && <div className="admin-overlay" onClick={() => setSelectedId(null)}><section className="order-detail-drawer customer-detail-drawer" role="dialog" aria-modal="true" aria-label="Private customer record" onClick={event => event.stopPropagation()}><button className="icon-circle drawer-close" onClick={() => setSelectedId(null)} aria-label="Close customer record"><X size={17} /></button>{history.isLoading ? <div className="loading-state"><LoaderCircle className="spin" />Loading private customer record…</div> : history.error ? <p className="form-error">{history.error.message}</p> : history.data && <><span className="eyebrow">PRIVATE CUSTOMER HISTORY</span><h2>{history.data.customer.name || "Cake-shop customer"}</h2><div className="customer-private-contact"><b>{history.data.customer.phone || "Phone not provided"}</b><span>{history.data.customer.email || "Email not provided"}</span><small>Saved customer address: {history.data.customer.defaultAddress || "Not saved"}</small></div><form className="customer-note-form" onSubmit={submitNotes}><label>Private team note<textarea rows={4} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Preferences or follow-up information relevant to customer service…" /><small>Visible only inside the protected bakery dashboard.</small></label><button className="button button-primary button-small" disabled={saveNotes.isPending}>{saveNotes.isPending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Save private note</button></form><div className="customer-history-list"><h3>Order history ({history.data.orders.length})</h3>{history.data.orders.length ? history.data.orders.map(order => <article className="customer-order-card" key={order.id}><div className="customer-order-heading"><b>{order.orderCode}</b><span className="status-pill">{order.status}</span></div><small>Placed {formatDate(order.createdAt)} · Fulfilment {order.fulfillmentMethod} · {formatDate(order.deliveryDate)}</small><p>{order.customerPhone} · {order.customerEmail || "No email"}</p><p>{order.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}: {order.deliveryAddress}</p><div className="drawer-total">Order total <b>{formatRupees(order.totalPaise)}</b></div></article>) : <p className="muted-copy">No orders are associated with this registered account yet.</p>}</div></>}</section></div>}
  </section>;
}
