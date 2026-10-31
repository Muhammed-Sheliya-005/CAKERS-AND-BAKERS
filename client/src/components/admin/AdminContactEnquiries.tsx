import { useMemo, useState } from "react";
import { LoaderCircle, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";
import { formatDate } from "../../lib/shop";

type EnquiryStatus = "new" | "in_progress" | "resolved";
const label: Record<EnquiryStatus, string> = { new: "New", in_progress: "In Progress", resolved: "Resolved" };

export default function AdminContactEnquiries() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EnquiryStatus>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const query = trpc.admin.ops.enquiries.useQuery({ search: search || undefined, status: statusFilter || undefined }, { refetchInterval: 30000 });
  const utils = trpc.useUtils();
  const update = trpc.admin.ops.updateEnquiry.useMutation();
  const selected = useMemo(() => query.data?.find(item => item.id === selectedId) ?? null, [query.data, selectedId]);
  const open = (item: NonNullable<typeof query.data>[number]) => { setSelectedId(item.id); setNotes(item.internalNotes ?? ""); };
  const saveNotes = async () => {
    if (!selected) return;
    try { await update.mutateAsync({ id: selected.id, status: selected.status, internalNotes: notes }); await utils.admin.ops.enquiries.invalidate(); toast.success("Private enquiry note saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Enquiry note could not be saved."); }
  };
  const setStatus = async (id: number, status: EnquiryStatus) => {
    const current = query.data?.find(item => item.id === id);
    if (!current || current.status === status) return;
    try { await update.mutateAsync({ id, status, internalNotes: current.internalNotes ?? "" }); await utils.admin.ops.enquiries.invalidate(); toast.success(`Enquiry marked ${label[status].toLowerCase()}.`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Status could not be updated."); }
  };
  return (
    <section className="admin-section">
      <div className="admin-toolbar"><div className="admin-toolbar-note"><span className="eyebrow">WEBSITE CONTACT</span><p>Customer messages are private; staff notes are never shown publicly.</p></div><label className="admin-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, subject or contact…" /></label><select className="admin-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="">All enquiry states</option><option value="new">New</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></div>
      {query.error && <p className="form-error">{query.error.message}</p>}
      <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">CUSTOMER QUESTIONS</span><h2>Messages to <em>the bakery.</em></h2></div><span className="table-count">{query.data?.length ?? 0} enquiries</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>SUBMITTED</th><th>FROM</th><th>SUBJECT / MESSAGE</th><th>STATUS</th><th /></tr></thead><tbody>{query.data?.map(item => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td><b>{item.customerName}</b><small>{item.phone || item.email || "No contact supplied"}</small>{item.phone && item.email && <small>{item.email}</small>}</td><td><b>{item.subject}</b><small className="enquiry-preview">{item.message}</small></td><td><select className="status-select" aria-label={`Status for ${item.subject}`} value={item.status} disabled={update.isPending} onChange={event => void setStatus(item.id, event.target.value as EnquiryStatus)}>{Object.entries(label).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></td><td><button className="view-detail" onClick={() => open(item)}>Read & note <MessageCircle size={14} /></button></td></tr>)}</tbody></table>{query.isLoading && <div className="loading-state"><LoaderCircle className="spin" /> Fetching customer messages…</div>}{!query.isLoading && !query.data?.length && <div className="customers-empty"><MessageCircle size={23} /><span>{search ? "No messages match this search." : "No general website enquiries yet. New contact forms will appear here."}</span></div>}</div></article>
      {selected && <div className="admin-overlay" onClick={() => setSelectedId(null)}><section className="order-detail-drawer enquiry-detail-drawer" role="dialog" aria-modal="true" aria-label={`Enquiry from ${selected.customerName}`} onClick={event => event.stopPropagation()}><button className="icon-circle drawer-close" onClick={() => setSelectedId(null)} aria-label="Close enquiry"><span aria-hidden="true">×</span></button><span className="eyebrow">WEBSITE ENQUIRY · {formatDate(selected.createdAt)}</span><h2>{selected.subject}</h2><span className={`status-pill status-${selected.status}`}>{label[selected.status]}</span><div className="detail-drawer-grid"><span>Customer</span><b>{selected.customerName}</b><span>Phone</span><b>{selected.phone || "Not provided"}</b><span>Email</span><b>{selected.email || "Not provided"}</b></div><h3>Customer message</h3><p className="enquiry-full-message">{selected.message}</p><label>Private staff notes<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={3000} rows={6} placeholder="Follow-up, call notes or next steps…" /></label><button className="button button-primary" disabled={update.isPending} onClick={() => void saveNotes()}>{update.isPending ? <LoaderCircle className="spin" size={15} /> : null} Save internal note</button></section></div>}
    </section>
  );
}
