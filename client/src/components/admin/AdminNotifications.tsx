import { useState } from "react";
import { AlertTriangle, Bell, LoaderCircle, MessageCircle, ShoppingBag } from "lucide-react";
import { trpc } from "../../lib/trpc";

type DashboardTab = "overview" | "products" | "orders" | "customers" | "offers" | "customCakes" | "enquiries" | "reviews" | "payments" | "inventory" | "reports" | "settings" | "team";
const tabMap: Record<string, DashboardTab> = { "/admin?tab=orders": "orders", "/admin?tab=custom-cakes": "customCakes", "/admin?tab=enquiries": "enquiries", "/admin?tab=inventory": "inventory", "/admin?tab=products": "products" };
export default function AdminNotifications({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) {
  const [open, setOpen] = useState(false);
  const query = trpc.admin.ops.notifications.useQuery(undefined, { refetchInterval: 30000 });
  const utils = trpc.useUtils();
  const markRead = trpc.admin.ops.markNotificationRead.useMutation({ onSuccess: () => { void utils.admin.ops.notifications.invalidate(); } });
  const unread = (query.data ?? []).filter(item => !item.readAt).length;
  return <div className="notification-wrap"><button className="notification-trigger" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen(value => !value)}><Bell size={18} />{unread > 0 && <span className="notification-badge">{unread > 9 ? "9+" : unread}</span>}</button>{open && <div className="notification-popover"><div className="notification-heading"><div><span className="eyebrow">COUNTER UPDATES</span><b>Notifications</b></div><button onClick={() => setOpen(false)} aria-label="Close notifications">×</button></div>{query.isLoading && <div className="notification-empty"><LoaderCircle className="spin" size={17} />Checking new activity…</div>}{query.error && <p className="form-error">{query.error.message}</p>}<div className="notification-list">{query.data?.map(item => { const target = tabMap[item.href] ?? "overview"; const Icon = item.kind === "order" ? ShoppingBag : item.kind === "low_stock" ? AlertTriangle : MessageCircle; return <button className={`notification-item ${item.readAt ? "notification-read" : ""}`} key={`${item.kind}-${item.id}`} onClick={() => { if (!item.isLowStock && !item.readAt) void markRead.mutate({ id: item.id }); onNavigate(target); setOpen(false); }}><span className="notification-icon"><Icon size={15} /></span><span><b>{item.title}</b><small>{item.body}</small><time>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(item.createdAt))}</time></span><i /></button>; })}</div>{!query.isLoading && !query.data?.length && <div className="notification-empty">You’re all caught up. New orders and website enquiries will appear here.</div>}</div>}</div>;
}
