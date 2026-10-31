import { useMemo, useState } from "react";
import { LoaderCircle, PackagePlus, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";
import { formatDate } from "../../lib/shop";

type Unit = "g" | "kg" | "ml" | "l" | "piece" | "box" | "pack";
type ItemDraft = { name: string; unit: Unit; quantity: string; minimumQuantity: string; supplier: string };
const blank: ItemDraft = { name: "", unit: "g", quantity: "0", minimumQuantity: "500", supplier: "" };
const displayQuantity = (milli: number) => (milli / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 });

export default function AdminInventory() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | undefined>();
  const [draft, setDraft] = useState<ItemDraft>(blank);
  const [movement, setMovement] = useState<{ itemId: number; kind: "received" | "used" | "adjustment" } | null>(null);
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [productMovementKind, setProductMovementKind] = useState<"received" | "used" | "adjustment">("received");
  const [productQuantity, setProductQuantity] = useState("");
  const [productNote, setProductNote] = useState("");
  const query = trpc.admin.ops.inventoryItems.useQuery(undefined, { refetchInterval: 30000 });
  const history = trpc.admin.ops.inventoryMovements.useQuery(undefined, { refetchInterval: 30000 });
  const products = trpc.admin.products.useQuery({});
  const actualProductId = selectedProductId || products.data?.[0]?.product.id || 0;
  const variants = trpc.admin.ops.productVariants.useQuery({ productId: actualProductId }, { enabled: actualProductId > 0 });
  const productHistory = trpc.admin.ops.productStockMovements.useQuery(undefined, { refetchInterval: 30000 });
  const utils = trpc.useUtils();
  const save = trpc.admin.ops.saveInventoryItem.useMutation();
  const adjust = trpc.admin.ops.adjustInventory.useMutation();
  const archive = trpc.admin.ops.archiveInventoryItem.useMutation();
  const adjustProduct = trpc.admin.ops.adjustProductStock.useMutation();
  const filtered = useMemo(() => (query.data ?? []).filter(item => `${item.name} ${item.supplier ?? ""}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const lowStock = filtered.filter(item => item.quantityMilli <= item.minimumQuantityMilli);
  const reset = () => { setEditingId(undefined); setDraft(blank); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({ id: editingId, ...draft, quantity: Number(draft.quantity), minimumQuantity: Number(draft.minimumQuantity), supplier: draft.supplier || undefined });
      await Promise.all([utils.admin.ops.inventoryItems.invalidate(), utils.admin.ops.inventoryMovements.invalidate(), utils.admin.ops.notifications.invalidate()]);
      toast.success(editingId ? "Inventory details saved." : "Ingredient added to the stock book.");
      reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Inventory could not be saved."); }
  };
  const submitMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movement) return;
    try {
      await adjust.mutateAsync({ itemId: movement.itemId, kind: movement.kind, quantity: Number(movementQuantity), note: movementNote });
      await Promise.all([utils.admin.ops.inventoryItems.invalidate(), utils.admin.ops.inventoryMovements.invalidate(), utils.admin.ops.notifications.invalidate()]);
      toast.success("Stock movement recorded.");
      setMovement(null); setMovementQuantity(""); setMovementNote("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Stock movement could not be saved."); }
  };
  const submitProductMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actualProductId) { toast.error("Add a cake before recording product stock."); return; }
    try {
      await adjustProduct.mutateAsync({ productId: actualProductId, variantId: selectedVariantId ? Number(selectedVariantId) : undefined, kind: productMovementKind, quantity: Number(productQuantity), note: productNote });
      await Promise.all([utils.admin.products.invalidate(), utils.admin.ops.productVariants.invalidate(), utils.admin.ops.productStockMovements.invalidate(), utils.admin.ops.notifications.invalidate(), utils.admin.ops.analytics.invalidate(), utils.catalog.home.invalidate(), utils.catalog.list.invalidate()]);
      toast.success("Cake stock movement recorded.");
      setProductQuantity(""); setProductNote("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cake stock movement could not be saved."); }
  };
  const startEdit = (item: NonNullable<typeof query.data>[number]) => {
    setEditingId(item.id);
    setDraft({ name: item.name, unit: item.unit as Unit, quantity: String(item.quantityMilli / 1000), minimumQuantity: String(item.minimumQuantityMilli / 1000), supplier: item.supplier ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <section className="admin-section admin-inventory-page">
      <div className="inventory-kpis"><article><span>Active supplies</span><strong>{query.data?.length ?? 0}</strong><small>Ingredient and packaging records</small></article><article className={lowStock.length ? "is-alert" : ""}><span>At or below minimum</span><strong>{lowStock.length}</strong><small>{lowStock.length ? "Replenishment may be needed" : "Stock levels are healthy"}</small></article><article><span>Stock audit</span><strong>{history.data?.length ?? 0}</strong><small>Most recent saved movements</small></article></div>
      <div className="inventory-layout">
        <form className="admin-panel inventory-editor" onSubmit={submit}>
          <div className="admin-panel-heading"><div><span className="eyebrow">BAKERY SUPPLIES</span><h2>{editingId ? "Edit an" : "Add an"} <em>ingredient.</em></h2></div>{editingId && <button type="button" className="icon-circle" onClick={reset} aria-label="Cancel inventory edit"><X size={16} /></button>}</div>
          <div className="form-grid">
            <label className="full-span">Ingredient or supply<input required minLength={2} maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Cocoa powder, butter, cake boxes…" /></label>
            <label>Unit<select value={draft.unit} onChange={event => setDraft({ ...draft, unit: event.target.value as Unit })}><option value="g">grams (g)</option><option value="kg">kilograms (kg)</option><option value="ml">millilitres (ml)</option><option value="l">litres (l)</option><option value="piece">pieces</option><option value="box">boxes</option><option value="pack">packs</option></select></label>
            <label>Available quantity<input required type="number" min="0" step="0.001" max="1000000" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} /></label>
            <label>Minimum stock threshold<input required type="number" min="0" step="0.001" max="1000000" value={draft.minimumQuantity} onChange={event => setDraft({ ...draft, minimumQuantity: event.target.value })} /></label>
            <label>Supplier (optional)<input maxLength={200} value={draft.supplier} onChange={event => setDraft({ ...draft, supplier: event.target.value })} placeholder="Supplier name" /></label>
          </div>
          <p className="muted-copy inventory-note">Quantities use the selected unit. Stock edits are recorded in the movement history; recipe-based automatic consumption is not enabled.</p>
          <button className="button button-primary button-small" disabled={save.isPending}>{save.isPending ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Save stock item</button>
        </form>
        <article className="admin-panel inventory-list-panel">
          <div className="admin-toolbar"><div><span className="eyebrow">THE PANTRY</span><h2>Stock <em>levels.</em></h2></div><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find flour, boxes…" /></label></div>
          {query.error && <p className="form-error">{query.error.message}</p>}
          <div className="inventory-item-list">{filtered.map(item => {
            const low = item.quantityMilli <= item.minimumQuantityMilli;
            return <article className={`inventory-item ${low ? "inventory-item-low" : ""}`} key={item.id}>
              <div className="inventory-item-main"><span className="inventory-symbol"><PackagePlus size={18} /></span><div><b>{item.name}</b><small>{item.supplier || "Supplier not recorded"} · Updated {formatDate(item.updatedAt)}</small></div></div>
              <div className="inventory-amount"><strong>{displayQuantity(item.quantityMilli)} <small>{item.unit}</small></strong><span>Minimum {displayQuantity(item.minimumQuantityMilli)} {item.unit}</span></div>
              <span className={`availability-label ${low ? "out-stock" : "in-stock"}`}>{low ? "Low stock" : "In stock"}</span>
              <div className="table-actions"><button title="Edit details" aria-label={`Edit ${item.name}`} onClick={() => startEdit(item)}><Pencil size={15} /></button><button title="Receive stock" aria-label={`Receive ${item.name}`} onClick={() => { setMovement({ itemId: item.id, kind: "received" }); setMovementQuantity(""); setMovementNote(""); }}><Plus size={15} /></button><button title="Record usage" aria-label={`Record ${item.name} usage`} onClick={() => { setMovement({ itemId: item.id, kind: "used" }); setMovementQuantity(""); setMovementNote(""); }}><span className="minus-icon">−</span></button><button title="Adjust stock" aria-label={`Adjust ${item.name} stock`} onClick={() => { setMovement({ itemId: item.id, kind: "adjustment" }); setMovementQuantity(String(item.quantityMilli / 1000)); setMovementNote("Physical stock count"); }}><span className="adjust-icon">±</span></button></div>
            </article>;
          })}</div>
          {query.isLoading && <div className="loading-state"><LoaderCircle className="spin" /> Loading pantry records…</div>}
          {!query.isLoading && !filtered.length && <div className="customers-empty"><PackagePlus size={24} /><span>{search ? "No pantry items match that search." : "No inventory items yet. Add flour, sugar, cocoa, cream, butter, eggs or cake boxes to begin."}</span></div>}
          {query.data?.length ? <button className="text-link archive-inventory" onClick={async () => { const target = window.prompt("Enter the inventory item ID to archive. Use the movement history to confirm the right record."); const id = Number(target); if (!Number.isInteger(id) || id <= 0) return; if (!window.confirm(`Archive inventory item #${id}? This hides it from active stock while retaining its movement history.`)) return; try { await archive.mutateAsync({ id }); await utils.admin.ops.inventoryItems.invalidate(); toast.success("Inventory item archived."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not archive item."); } }}>Archive an inactive supply record</button> : null}
        </article>
      </div>
      <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Recent stock <em>movements.</em></h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>WHEN</th><th>ITEM</th><th>MOVEMENT</th><th>CHANGE</th><th>NOTE</th><th>RECORDED BY</th></tr></thead><tbody>{history.data?.map(row => <tr key={row.movement.id}><td>{formatDate(row.movement.createdAt)}</td><td><b>{row.itemName}</b></td><td>{row.movement.kind}</td><td className={row.movement.deltaMilli < 0 ? "movement-negative" : "movement-positive"}>{row.movement.deltaMilli > 0 ? "+" : ""}{displayQuantity(row.movement.deltaMilli)} {row.unit}</td><td>{row.movement.note}</td><td>{row.userName || "Team account"}</td></tr>)}</tbody></table>{history.isLoading && <div className="loading-state"><LoaderCircle className="spin" /> Loading stock history…</div>}{!history.isLoading && !history.data?.length && <p className="table-empty muted-copy">Recorded receipts, usage and adjustments will appear here.</p>}</div></article>
      <div className="product-stock-workspace">
        <form className="admin-panel product-stock-editor" onSubmit={submitProductMovement}>
          <div className="admin-panel-heading"><div><span className="eyebrow">CAKE CATALOGUE STOCK</span><h2>Stock the <em>display case.</em></h2></div><PackagePlus size={18} /></div>
          <p className="muted-copy">Base cake stock and size-specific quantities are kept distinct. Each receipt, usage, adjustment and successful order creates a movement record.</p>
          <div className="form-grid">
            <label>Cake<select value={actualProductId} onChange={event => { setSelectedProductId(Number(event.target.value)); setSelectedVariantId(""); }}><option value={0}>Choose a cake</option>{products.data?.map(row => <option key={row.product.id} value={row.product.id}>{row.product.name}</option>)}</select></label>
            <label>Stock item<select value={selectedVariantId} onChange={event => setSelectedVariantId(event.target.value)}><option value="">Base product stock</option>{variants.data?.map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {variant.stock} units</option>)}</select></label>
            <label>Movement<select value={productMovementKind} onChange={event => setProductMovementKind(event.target.value as typeof productMovementKind)}><option value="received">Receive units</option><option value="used">Record usage</option><option value="adjustment">Set counted quantity</option></select></label>
            <label>{productMovementKind === "adjustment" ? "Counted quantity" : "Units"}<input required type="number" min={productMovementKind === "adjustment" ? "0" : "1"} step="1" max="10000" value={productQuantity} onChange={event => setProductQuantity(event.target.value)} /></label>
            <label className="full-span">Reason / reference<input required minLength={3} maxLength={500} value={productNote} onChange={event => setProductNote(event.target.value)} placeholder="Fresh batch, kitchen use, physical stock count…" /></label>
          </div>
          <button className="button button-primary button-small" disabled={!actualProductId || adjustProduct.isPending}>{adjustProduct.isPending ? <LoaderCircle className="spin" size={15} /> : <PackagePlus size={15} />} Save product-stock movement</button>
        </form>
        <article className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">PRODUCT MOVEMENT AUDIT</span><h2>Cake stock <em>history.</em></h2></div><span className="table-count">{productHistory.data?.length ?? 0} movements</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>WHEN</th><th>CAKE / SIZE</th><th>TYPE</th><th>CHANGE</th><th>REFERENCE</th><th>RECORDED BY</th></tr></thead><tbody>{productHistory.data?.map(row => <tr key={row.movement.id}><td>{formatDate(row.movement.createdAt)}</td><td><b>{row.productName}</b><small>{row.variantName || "Base stock"}</small></td><td>{row.movement.kind}</td><td className={row.movement.delta < 0 ? "movement-negative" : "movement-positive"}>{row.movement.delta > 0 ? "+" : ""}{row.movement.delta} units</td><td>{row.movement.note}</td><td>{row.userName || "Customer order / system"}</td></tr>)}</tbody></table>{productHistory.isLoading && <div className="loading-state"><LoaderCircle className="spin" />Loading cake stock history…</div>}{!productHistory.isLoading && !productHistory.data?.length && <p className="table-empty muted-copy">Cake-size edits and customer orders will add stock history here.</p>}</div></article>
      </div>
      {movement && <div className="admin-overlay" onClick={() => setMovement(null)}><form className="order-detail-drawer inventory-movement-drawer" onClick={event => event.stopPropagation()} onSubmit={submitMovement}><button type="button" className="icon-circle drawer-close" onClick={() => setMovement(null)} aria-label="Close movement form"><X size={16} /></button><span className="eyebrow">STOCK MOVEMENT</span><h2>{movement.kind === "received" ? "Receive" : movement.kind === "used" ? "Record usage" : "Set stock count"}</h2><p className="muted-copy">{query.data?.find(item => item.id === movement.itemId)?.name}</p><label>{movement.kind === "adjustment" ? "Counted quantity" : "Quantity"}<input required type="number" min={movement.kind === "adjustment" ? "0" : "0.001"} step="0.001" value={movementQuantity} onChange={event => setMovementQuantity(event.target.value)} /></label><label>Reason / reference<input required minLength={3} maxLength={500} value={movementNote} onChange={event => setMovementNote(event.target.value)} placeholder="Delivery received, kitchen usage, stock count…" /></label><button className="button button-primary" disabled={adjust.isPending}>{adjust.isPending ? <LoaderCircle className="spin" size={15} /> : <PackagePlus size={15} />} Save movement</button></form></div>}
    </section>
  );
}
