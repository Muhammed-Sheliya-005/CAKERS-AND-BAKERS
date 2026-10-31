import { useEffect, useState } from "react";
import { Check, LoaderCircle, MapPin, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";
import { formatRupees } from "../../lib/shop";

type SettingsDraft = {
  businessName: string; businessAddress: string; contactPhone: string; contactEmail: string; openingHours: string;
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFeeRupees: string; freeDeliveryThresholdRupees: string;
  acceptingOrders: boolean; allowedPaymentMethods: Array<"cod" | "pay_at_store">;
  notifyNewOrders: boolean; notifyNewEnquiries: boolean; notifyLowStock: boolean;
};
type SettingsRecord = {
  businessName: string; businessAddress: string; contactPhone: string; contactEmail: string; openingHours: string;
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFeePaise: number; freeDeliveryThresholdPaise: number;
  acceptingOrders: boolean; allowedPaymentMethods: string; notifyNewOrders: boolean; notifyNewEnquiries: boolean;
  notifyLowStock: boolean; timezone: string; updatedAt: Date;
};
function toDraft(value: SettingsRecord): SettingsDraft {
  return { businessName: value.businessName, businessAddress: value.businessAddress, contactPhone: value.contactPhone, contactEmail: value.contactEmail, openingHours: value.openingHours, deliveryEnabled: value.deliveryEnabled, pickupEnabled: value.pickupEnabled, deliveryFeeRupees: String(value.deliveryFeePaise / 100), freeDeliveryThresholdRupees: String(value.freeDeliveryThresholdPaise / 100), acceptingOrders: value.acceptingOrders, allowedPaymentMethods: value.allowedPaymentMethods.split(",").filter((value): value is "cod" | "pay_at_store" => value === "cod" || value === "pay_at_store"), notifyNewOrders: value.notifyNewOrders, notifyNewEnquiries: value.notifyNewEnquiries, notifyLowStock: value.notifyLowStock };
}
function Toggle({ checked, onChange, children, description }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode; description: string }) {
  return <label className="settings-toggle"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span className="settings-switch" aria-hidden="true" /><span><b>{children}</b><small>{description}</small></span></label>;
}
export default function AdminSettings() {
  const query = trpc.admin.ops.businessSettings.useQuery();
  const savedSettings = query.data as SettingsRecord | undefined;
  const utils = trpc.useUtils();
  const save = trpc.admin.ops.saveBusinessSettings.useMutation();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  useEffect(() => { if (savedSettings) setDraft(toDraft(savedSettings)); }, [savedSettings]);
  if (query.isLoading) return <div className="loading-state"><LoaderCircle className="spin" />Opening the bakery settings…</div>;
  if (query.error || !draft) return <p className="form-error">{query.error?.message ?? "Business settings could not be loaded."}</p>;
  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => setDraft(old => old ? { ...old, [key]: value } : old);
  const setMethod = (method: "cod" | "pay_at_store", enabled: boolean) => set("allowedPaymentMethods", enabled ? [...new Set([...draft.allowedPaymentMethods, method])] : draft.allowedPaymentMethods.filter(value => value !== method));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.deliveryEnabled && !draft.pickupEnabled) { toast.error("Enable pickup, delivery, or both."); return; }
    if (!draft.allowedPaymentMethods.length) { toast.error("Keep at least one offline payment method enabled."); return; }
    try { await save.mutateAsync({ ...draft, deliveryFeeRupees: Number(draft.deliveryFeeRupees), freeDeliveryThresholdRupees: Number(draft.freeDeliveryThresholdRupees), timezone: "Asia/Kolkata" }); await Promise.all([utils.admin.ops.businessSettings.invalidate(), utils.storefront.businessProfile.invalidate(), utils.admin.ops.notifications.invalidate()]); toast.success("Business settings saved and applied to the storefront."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Business settings could not be saved."); }
  };
  return <section className="admin-section admin-settings-page">
    <div className="settings-live-banner"><span className="settings-live-dot" /><div><b>These details power the public shop</b><small>Address, contact information, pickup/delivery choices, fees and order-acceptance status update the live storefront and checkout.</small></div><Link href="/contact">View contact page <MapPin size={14} /></Link></div>
    <form className="settings-grid" onSubmit={submit}>
      <article className="admin-panel settings-panel"><div className="admin-panel-heading"><div><span className="eyebrow">SHOP PROFILE</span><h2>About the <em>bakery.</em></h2></div><Settings2 size={19} /></div><div className="form-grid"><label>Business name<input required minLength={2} maxLength={120} value={draft.businessName} onChange={event => set("businessName", event.target.value)} /></label><label>Phone number<input maxLength={32} pattern="[+()0-9 .-]{0,32}" value={draft.contactPhone} onChange={event => set("contactPhone", event.target.value)} placeholder="Add the bakery contact number" /></label><label className="full-span">Business address<textarea required minLength={8} maxLength={1200} rows={3} value={draft.businessAddress} onChange={event => set("businessAddress", event.target.value)} /></label><label>Contact email<input type="email" maxLength={320} value={draft.contactEmail} onChange={event => set("contactEmail", event.target.value)} placeholder="Add a monitored business email" /></label><label>Opening hours<input required minLength={2} maxLength={500} value={draft.openingHours} onChange={event => set("openingHours", event.target.value)} placeholder="e.g. Tuesday–Sunday · 10:00 am–8:00 pm" /></label><label className="full-span">Business timezone<select value="Asia/Kolkata" disabled><option value="Asia/Kolkata">Asia/Kolkata · India Standard Time</option></select><small>Fixed to Jogeshwari West local time for order dates, reports and customer-facing time windows.</small></label></div></article>
      <article className="admin-panel settings-panel"><div className="admin-panel-heading"><div><span className="eyebrow">CHECKOUT PREFERENCES</span><h2>Taking <em>orders.</em></h2></div></div><div className="settings-toggle-list"><Toggle checked={draft.acceptingOrders} onChange={value => set("acceptingOrders", value)} description="When off, customers can browse but cannot place new orders.">Accept online orders</Toggle><Toggle checked={draft.deliveryEnabled} onChange={value => set("deliveryEnabled", value)} description="Customers may choose delivery and see the current fee policy.">Offer delivery</Toggle><Toggle checked={draft.pickupEnabled} onChange={value => set("pickupEnabled", value)} description="Customers may choose pickup from the shop address.">Offer bakery pickup</Toggle></div><div className="form-grid settings-fees"><label>Delivery fee (₹)<input required type="number" min="0" step="1" value={draft.deliveryFeeRupees} onChange={event => set("deliveryFeeRupees", event.target.value)} /></label><label>Free delivery from (₹)<input required type="number" min="0" step="1" value={draft.freeDeliveryThresholdRupees} onChange={event => set("freeDeliveryThresholdRupees", event.target.value)} /><small>Use 0 for no threshold.</small></label></div><div className="settings-payment-list"><span className="admin-field-label">AVAILABLE OFFLINE PAYMENT OPTIONS</span><Toggle checked={draft.allowedPaymentMethods.includes("cod")} onChange={value => setMethod("cod", value)} description="Cash collected on delivery; no online processing.">Cash on Delivery</Toggle><Toggle checked={draft.allowedPaymentMethods.includes("pay_at_store")} onChange={value => setMethod("pay_at_store", value)} description="Customer settles in person at the bakery.">Pay at store</Toggle><small>There is no online payment gateway configured in this project.</small></div><div className="checkout-preview"><span>Current fee example</span><b>{draft.deliveryEnabled ? Number(draft.freeDeliveryThresholdRupees) > 0 ? `${formatRupees(Number(draft.deliveryFeeRupees) * 100)} fee · free from ${formatRupees(Number(draft.freeDeliveryThresholdRupees) * 100)}` : "Free delivery" : "Delivery is off"}</b></div></article>
      <article className="admin-panel settings-panel settings-notifications"><div className="admin-panel-heading"><div><span className="eyebrow">WORKSPACE ALERTS</span><h2>Keep the team <em>in the loop.</em></h2></div></div><div className="settings-toggle-list"><Toggle checked={draft.notifyNewOrders} onChange={value => set("notifyNewOrders", value)} description="Add a dashboard notification whenever checkout saves a new order.">New cake orders</Toggle><Toggle checked={draft.notifyNewEnquiries} onChange={value => set("notifyNewEnquiries", value)} description="Notify staff about contact-form and custom-cake enquiries.">Customer messages</Toggle><Toggle checked={draft.notifyLowStock} onChange={value => set("notifyLowStock", value)} description="Show current product and pantry items at/below their configured threshold.">Low-stock reminders</Toggle></div></article>
      <div className="settings-save-row"><button className="button button-primary" disabled={save.isPending}>{save.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Save bakery settings</button><span>Last saved {savedSettings?.updatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(savedSettings.updatedAt)) : "—"}</span></div>
    </form>
  </section>;
}
