import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CakeSlice,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  LoaderCircle,
  LogOut,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { startLogin } from "../const";
import { useAuth } from "../_core/hooks/useAuth";
import AdminCustomers from "../components/AdminCustomers";
import AdminImageUpload from "../components/AdminImageUpload";
import BrandMark from "../components/BrandMark";
import { trpc } from "../lib/trpc";
import { formatDate, formatRupees } from "../lib/shop";
import { ORDER_STATUS_VALUES } from "../../../shared/shop";

type Tab =
  | "overview"
  | "products"
  | "orders"
  | "customers"
  | "offers"
  | "enquiries"
  | "reviews";
const tabs: Array<{ id: Tab; label: string; icon: typeof CakeSlice }> = [
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "products", label: "Products", icon: CakeSlice },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "offers", label: "Special offers", icon: Tag },
  { id: "enquiries", label: "Custom cakes", icon: MessageCircle },
  { id: "reviews", label: "Reviews", icon: Star },
];
function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Checking your admin access…
      </div>
    );
  if (!user)
    return (
      <div className="admin-gate">
        <span className="admin-gate-icon">
          <ShieldCheck size={24} />
        </span>
        <span className="eyebrow">THE BAKERY BACK ROOM</span>
        <h1>
          Admin <em>sign-in.</em>
        </h1>
        <p>
          Sign in with the authorised project owner account. Administration is
          protected by a server-side role check.
        </p>
        <button className="button button-primary" onClick={() => startLogin()}>
          Sign in with Manus <ArrowUpRight size={15} />
        </button>
        <Link href="/" className="text-link">
          Back to the shop
        </Link>
      </div>
    );
  if (user.role !== "admin")
    return (
      <div className="admin-gate">
        <span className="admin-gate-icon">
          <ShieldCheck size={24} />
        </span>
        <span className="eyebrow">RESTRICTED AREA</span>
        <h1>
          This area is for the <em>bakery team.</em>
        </h1>
        <p>
          Your signed-in account does not have administrator access. Customer
          accounts cannot open the management workspace.
        </p>
        <Link href="/" className="button button-outline">
          Back to the shop
        </Link>
      </div>
    );
  return <>{children}</>;
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  return (
    <AdminGate>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link className="admin-brand" href="/">
            <span className="brand-mark">
              <BrandMark />
            </span>
            <span>
              <b>
                Cakers <i>&</i> Cakers
              </b>
              <small>BAKERY WORKSPACE</small>
            </span>
          </Link>
          <div className="admin-side-label">YOUR COUNTER</div>
          <nav className="admin-side-nav">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={activeTab === id ? "active" : ""}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={17} />
                <span>{label}</span>
                {activeTab === id && <span className="admin-nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-bottom">
            <div className="admin-user">
              <span>{user?.name?.[0] || "C"}</span>
              <div>
                <b>{user?.name || "Bakery admin"}</b>
                <small>Authorised administrator</small>
              </div>
            </div>
            <button className="admin-signout" onClick={() => void logout()}>
              <LogOut size={15} /> Sign out
            </button>
            <Link href="/" className="admin-back-shop">
              <ExternalLink size={15} /> View storefront
            </Link>
          </div>
        </aside>
        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <span className="eyebrow">CAKERS & CAKERS / ADMIN</span>
              <h1>{tabs.find(tab => tab.id === activeTab)?.label}</h1>
            </div>
            <Link href="/" className="admin-visit">
              Visit shop <ExternalLink size={14} />
            </Link>
          </header>
          <div className="admin-content">
            {activeTab === "overview" && (
              <Overview onViewOrders={() => setActiveTab("orders")} />
            )}
            {activeTab === "products" && <ProductsManager />}
            {activeTab === "orders" && <OrdersManager />}
            {activeTab === "customers" && <AdminCustomers />}
            {activeTab === "offers" && <OffersManager />}
            {activeTab === "enquiries" && <EnquiriesManager />}
            {activeTab === "reviews" && <ReviewsManager />}
          </div>
        </main>
      </div>
    </AdminGate>
  );
}

function Overview({ onViewOrders }: { onViewOrders: () => void }) {
  const query = trpc.admin.dashboard.useQuery();
  const orders = trpc.admin.orders.useQuery({});
  const summary = query.data;
  const cards = summary
    ? ([
        ["Total orders", summary.totalOrders, "All time", ShoppingBag, "rose"],
        [
          "Needs a little love",
          summary.pendingOrders,
          "Open orders",
          PackageCheck,
          "gold",
        ],
        [
          "Delivered",
          summary.completedOrders,
          "Completed orders",
          Check,
          "green",
        ],
        [
          "Products on the shelf",
          summary.totalProducts,
          "In the catalogue",
          CakeSlice,
          "pink",
        ],
        [
          "Custom cake notes",
          summary.customEnquiries,
          "Waiting for a reply",
          MessageCircle,
          "violet",
        ],
        [
          "Sales on the books",
          formatRupees(summary.salesPaise),
          "Excluding cancelled orders",
          Tag,
          "chocolate",
        ],
      ] as const)
    : [];
  if (query.isLoading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Opening the order book…
      </div>
    );
  return (
    <div className="overview-content">
      <div className="admin-welcome">
        <div>
          <span className="eyebrow">A FRESH LOOK AT THE COUNTER</span>
          <h2>
            Good morning, <em>bakery team.</em>
          </h2>
          <p>Your overview is calculated directly from saved shop data.</p>
        </div>
        <div className="overview-date">
          {new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(
            new Date()
          )}
        </div>
      </div>
      {query.error && <p className="form-error">{query.error.message}</p>}
      <div className="summary-stat-grid">
        {cards.map(([label, value, hint, Icon, color]) => (
          <article className="summary-stat" key={label}>
            <span className={`stat-icon stat-${color}`}>
              <Icon size={19} />
            </span>
            <span className="stat-label">{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">THE LATEST</span>
            <h2>
              Fresh off the <em>order book.</em>
            </h2>
          </div>
          <button className="text-link" onClick={onViewOrders}>
            View all <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>GUEST</th>
                <th>DELIVERY</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.slice(0, 6).map(order => (
                <tr key={order.id}>
                  <td className="table-order-code">{order.orderCode}</td>
                  <td>
                    {order.customerName}
                    <small>{order.customerPhone}</small>
                  </td>
                  <td>{formatDate(order.deliveryDate)}</td>
                  <td>{formatRupees(order.totalPaise)}</td>
                  <td>
                    <span
                      className={`status-pill ${order.status === "Delivered" ? "status-done" : order.status === "Cancelled" ? "status-cancelled-pill" : ""}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders.data || orders.data.length === 0) && (
            <p className="muted-copy table-empty">
              No orders yet. New orders will appear here after checkout.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

type Category = { id: number; name: string };
type ProductRow = {
  product: {
    id: number;
    categoryId: number;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    pricePaise: number;
    stock: number;
    isAvailable: boolean;
    isNew: boolean;
    isFeatured: boolean;
  };
  categoryName: string | null;
};
type EditorState = {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  priceRupees: string;
  stock: string;
  isAvailable: boolean;
  isNew: boolean;
  isFeatured: boolean;
};
const emptyEditor = (categoryId = 0): EditorState => ({
  categoryId,
  name: "",
  slug: "",
  description: "",
  imageUrl: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-1.webp",
  priceRupees: "",
  stock: "12",
  isAvailable: true,
  isNew: false,
  isFeatured: false,
});
function productEditor(product: ProductRow["product"]): EditorState {
  return {
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    imageUrl: product.imageUrl,
    priceRupees: String(product.pricePaise / 100),
    stock: String(product.stock),
    isAvailable: product.isAvailable,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
  };
}
function ProductsManager() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EditorState>(emptyEditor());
  const categories = trpc.admin.categories.useQuery();
  const query = trpc.admin.products.useQuery({ search: search || undefined });
  const utils = trpc.useUtils();
  const create = trpc.admin.createProduct.useMutation();
  const update = trpc.admin.updateProduct.useMutation();
  const remove = trpc.admin.deleteProduct.useMutation();
  const beginCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(emptyEditor(categories.data?.[0]?.id ?? 0));
  };
  const beginEdit = (row: ProductRow) => {
    setCreating(false);
    setEditing(row);
    setForm(productEditor(row.product));
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        priceRupees: Number(form.priceRupees),
        stock: Number(form.stock),
      };
      if (editing)
        await update.mutateAsync({ id: editing.product.id, ...payload });
      else await create.mutateAsync(payload);
      await utils.admin.products.invalidate();
      close();
      toast.success(
        editing ? "Cake details updated." : "Cake added to the counter."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save this cake."
      );
    }
  };
  const confirmDelete = async (row: ProductRow) => {
    if (
      !window.confirm(
        `Remove ${row.product.name} from the active catalogue? Historical order details will remain saved.`
      )
    )
      return;
    try {
      await remove.mutateAsync({ id: row.product.id });
      await utils.admin.products.invalidate();
      toast.success("Cake removed from the catalogue.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove this cake."
      );
    }
  };
  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search cake names…"
          />
        </label>
        <button
          className="button button-primary button-small"
          onClick={beginCreate}
        >
          <Plus size={16} /> Add a cake
        </button>
      </div>
      {(creating || editing) && (
        <form className="admin-editor" onSubmit={submit}>
          <div className="admin-editor-heading">
            <div>
              <span className="eyebrow">
                {editing ? "EDIT THE DETAILS" : "A NEW LITTLE DELIGHT"}
              </span>
              <h2>{editing ? editing.product.name : "Add a cake"}</h2>
            </div>
            <button
              type="button"
              className="icon-circle"
              onClick={close}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Cake name
              <input
                required
                minLength={2}
                maxLength={140}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              URL slug
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                placeholder="strawberry-cloud"
              />
            </label>
            <label>
              Category
              <select
                value={form.categoryId}
                onChange={e =>
                  setForm({ ...form, categoryId: Number(e.target.value) })
                }
              >
                {categories.data?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price in ₹
              <input
                required
                type="number"
                min="1"
                max="200000"
                value={form.priceRupees}
                onChange={e =>
                  setForm({ ...form, priceRupees: e.target.value })
                }
              />
            </label>
            <label>
              Stock available
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
              />
            </label>
            <div className="full-span">
              <span className="admin-field-label">PRODUCT PHOTOGRAPH</span>
              <AdminImageUpload
                value={form.imageUrl}
                onChange={imageUrl => setForm({ ...form, imageUrl })}
              />
              <small>
                JPEG, PNG or WebP under 4 MB, or enter an existing trusted
                HTTPS/managed image path.
              </small>
            </div>
            <label className="full-span">
              Secure image URL
              <input
                required
                value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              />
            </label>
            <label className="full-span">
              Description
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </label>
            <div className="checkbox-row full-span">
              <label>
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={e =>
                    setForm({ ...form, isAvailable: e.target.checked })
                  }
                />{" "}
                Available
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isNew}
                  onChange={e => setForm({ ...form, isNew: e.target.checked })}
                />{" "}
                New arrival
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={e =>
                    setForm({ ...form, isFeatured: e.target.checked })
                  }
                />{" "}
                Featured
              </label>
            </div>
          </div>
          <button
            className="button button-primary button-small"
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}{" "}
            Save cake
          </button>
        </form>
      )}
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">THE CAKE COUNTER</span>
            <h2>
              Products <em>on the shelf.</em>
            </h2>
          </div>
          <span className="table-count">{query.data?.length ?? 0} items</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>CAKE</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>AVAILABILITY</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map(({ product, categoryName }) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product">
                      <img src={product.imageUrl} alt="" />
                      <span>
                        {product.name}
                        <small>/{product.slug}</small>
                      </span>
                    </div>
                  </td>
                  <td>{categoryName}</td>
                  <td>{formatRupees(product.pricePaise)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span
                      className={`availability-label ${product.isAvailable && product.stock ? "in-stock" : "out-stock"}`}
                    >
                      {product.isAvailable && product.stock
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        title="Edit"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => beginEdit({ product, categoryName })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Remove"
                        aria-label={`Remove ${product.name}`}
                        onClick={() =>
                          void confirmDelete({ product, categoryName })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isLoading && (
            <div className="loading-state">
              <LoaderCircle className="spin" />
              Loading cakes…
            </div>
          )}
          {!query.isLoading && !query.data?.length && (
            <p className="table-empty muted-copy">
              No cakes match that search.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function OrdersManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const query = trpc.admin.orders.useQuery({
    search: search || undefined,
    status: status
      ? (status as (typeof ORDER_STATUS_VALUES)[number])
      : undefined,
  });
  const details = trpc.admin.orderDetails.useQuery(
    { id: selected ?? 0 },
    { enabled: selected !== null }
  );
  const utils = trpc.useUtils();
  const update = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      void utils.admin.orders.invalidate();
      void utils.admin.dashboard.invalidate();
      void utils.admin.orderDetails.invalidate();
      toast.success("Order status updated.");
    },
  });
  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ID, guest or phone…"
          />
        </label>
        <select
          className="admin-filter"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">Every status</option>
          {ORDER_STATUS_VALUES.map(value => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">BAKING IN PROGRESS</span>
            <h2>
              The order <em>book.</em>
            </h2>
          </div>
          <span className="table-count">
            {query.data?.length ?? 0} recent orders
          </span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER / GUEST</th>
                <th>DELIVERY</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map(order => (
                <tr key={order.id}>
                  <td>
                    <button
                      className="table-order-code"
                      onClick={() => setSelected(order.id)}
                    >
                      {order.orderCode}
                    </button>
                    <small>
                      {order.customerName} · {order.customerPhone}
                    </small>
                  </td>
                  <td>
                    {formatDate(order.deliveryDate)}
                    <small>{order.deliveryTime}</small>
                  </td>
                  <td>{formatRupees(order.totalPaise)}</td>
                  <td>
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={e =>
                        update.mutate({
                          id: order.id,
                          status: e.target
                            .value as (typeof ORDER_STATUS_VALUES)[number],
                        })
                      }
                    >
                      {ORDER_STATUS_VALUES.map(value => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="view-detail"
                      onClick={() => setSelected(order.id)}
                    >
                      Details <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isLoading && (
            <div className="loading-state">
              <LoaderCircle className="spin" />
              Opening the order book…
            </div>
          )}
          {!query.data?.length && !query.isLoading && (
            <p className="table-empty muted-copy">No orders found.</p>
          )}
        </div>
      </div>
      {selected !== null && (
        <div className="admin-overlay" onClick={() => setSelected(null)}>
          <section
            className="order-detail-drawer"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="icon-circle drawer-close"
              onClick={() => setSelected(null)}
            >
              <X size={17} />
            </button>
            {details.isLoading ? (
              <LoaderCircle className="spin" />
            ) : (
              details.data && (
                <>
                  <span className="eyebrow">ORDER DETAILS</span>
                  <h2>{details.data.orderCode}</h2>
                  <span className="status-pill">{details.data.status}</span>
                  <div className="detail-drawer-grid">
                    <span>Customer</span>
                    <b>{details.data.customerName}</b>
                    <span>Phone</span>
                    <b>{details.data.customerPhone}</b>
                    <span>Email</span>
                    <b>{details.data.customerEmail || "Not provided"}</b>
                    <span>Delivery</span>
                    <b>
                      {formatDate(details.data.deliveryDate)} ·{" "}
                      {details.data.deliveryTime}
                    </b>
                    <span>Address</span>
                    <b>{details.data.deliveryAddress}</b>
                    <span>Instructions</span>
                    <b>{details.data.instructions || "—"}</b>
                    <span>Payment</span>
                    <b>
                      {details.data.paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : "Pay at store"}
                    </b>
                  </div>
                  <h3>Items & saved prices</h3>
                  {details.data.items.map(item => (
                    <div className="drawer-item" key={item.id}>
                      <span>
                        {item.productNameSnapshot} × {item.quantity}
                      </span>
                      <b>{formatRupees(item.lineTotalPaise)}</b>
                    </div>
                  ))}
                  <div className="drawer-total">
                    Order total <b>{formatRupees(details.data.totalPaise)}</b>
                  </div>
                </>
              )
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function OffersManager() {
  const products = trpc.admin.products.useQuery({});
  const query = trpc.admin.offers.useQuery();
  const [editingId, setEditingId] = useState<number | undefined>();
  const [productId, setProductId] = useState(0);
  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("10");
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endsAt, setEndsAt] = useState("2026-12-31");
  const [isActive, setIsActive] = useState(true);
  const utils = trpc.useUtils();
  const save = trpc.admin.saveOffer.useMutation();
  const remove = trpc.admin.deleteOffer.useMutation();
  const reset = () => {
    setEditingId(undefined);
    setTitle("");
    setDiscount("10");
    setProductId(products.data?.[0]?.product.id ?? 0);
    setIsActive(true);
  };
  const beginEdit = (row: NonNullable<typeof query.data>[number]) => {
    setEditingId(row.offer.id);
    setProductId(row.offer.productId);
    setTitle(row.offer.title);
    setDiscount(String(row.offer.discountPercent));
    setStartsAt(new Date(row.offer.startsAt).toISOString().slice(0, 10));
    setEndsAt(new Date(row.offer.endsAt).toISOString().slice(0, 10));
    setIsActive(row.offer.isActive);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({
        id: editingId,
        productId,
        title,
        discountPercent: Number(discount),
        startsAt,
        endsAt,
        isActive,
      });
      await utils.admin.offers.invalidate();
      await utils.catalog.invalidate();
      reset();
      toast.success("Special offer saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save this offer."
      );
    }
  };
  return (
    <div className="admin-section">
      <form className="admin-editor offer-editor" onSubmit={submit}>
        <div className="admin-editor-heading">
          <div>
            <span className="eyebrow">
              {editingId ? "UPDATE A PROMOTION" : "A LITTLE SOMETHING OFF"}
            </span>
            <h2>{editingId ? "Edit special" : "Create a special"}</h2>
          </div>
          {editingId && (
            <button type="button" className="text-link" onClick={reset}>
              New offer
            </button>
          )}
        </div>
        <div className="form-grid">
          <label>
            Cake
            <select
              required
              value={productId || ""}
              onChange={e => setProductId(Number(e.target.value))}
            >
              <option value="" disabled>
                Choose a cake
              </option>
              {products.data?.map(({ product }) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Offer title
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="A little berry bonus"
            />
          </label>
          <label>
            Discount (%)
            <input
              type="number"
              required
              min="1"
              max="80"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
          </label>
          <label>
            Starts
            <input
              type="date"
              required
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
            />
          </label>
          <label>
            Ends
            <input
              type="date"
              required
              min={startsAt}
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />{" "}
            Offer is active
          </label>
        </div>
        <button
          className="button button-primary button-small"
          disabled={save.isPending}
        >
          {save.isPending ? (
            <LoaderCircle className="spin" />
          ) : (
            <Check size={15} />
          )}{" "}
          Save special
        </button>
      </form>
      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">THE LITTLE EXTRAS</span>
            <h2>
              Special <em>offers.</em>
            </h2>
          </div>
          <span className="table-count">{query.data?.length ?? 0} offers</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>OFFER</th>
                <th>CAKE</th>
                <th>DISCOUNT</th>
                <th>VALID</th>
                <th>STATE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map(row => (
                <tr key={row.offer.id}>
                  <td>{row.offer.title}</td>
                  <td>{row.productName}</td>
                  <td>{row.offer.discountPercent}%</td>
                  <td>
                    {formatDate(row.offer.startsAt)} –{" "}
                    {formatDate(row.offer.endsAt)}
                  </td>
                  <td>
                    <span
                      className={`availability-label ${row.offer.isActive && new Date(row.offer.endsAt) >= new Date() ? "in-stock" : "out-stock"}`}
                    >
                      {row.offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        onClick={() => beginEdit(row)}
                        aria-label="Edit offer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm("Remove this offer?")) return;
                          await remove.mutateAsync({ id: row.offer.id });
                          await utils.admin.offers.invalidate();
                          await utils.catalog.invalidate();
                          toast.success("Offer removed.");
                        }}
                        aria-label="Remove offer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EnquiriesManager() {
  const [statusFilter, setFilter] = useState("");
  const query = trpc.admin.enquiries.useQuery({
    status: statusFilter
      ? (statusFilter as "pending" | "contacted" | "accepted" | "rejected")
      : undefined,
  });
  const utils = trpc.useUtils();
  const update = trpc.admin.updateEnquiryStatus.useMutation({
    onSuccess: () => {
      void utils.admin.enquiries.invalidate();
      void utils.admin.dashboard.invalidate();
      toast.success("Enquiry status updated.");
    },
  });
  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="admin-toolbar-note">
          <span className="eyebrow">MADE-TO-ORDER IDEAS</span>
          <p>Review each request and follow up with the customer.</p>
        </div>
        <select
          className="admin-filter"
          value={statusFilter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">Every enquiry</option>
          {["pending", "contacted", "accepted", "rejected"].map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="enquiry-grid">
        {query.data?.map(enquiry => (
          <article className="enquiry-card" key={enquiry.id}>
            <div className="enquiry-card-head">
              <span className="eyebrow">REQUEST #{enquiry.id}</span>
              <span className={`status-pill status-${enquiry.status}`}>
                {enquiry.status}
              </span>
            </div>
            <h3>{enquiry.customerName}</h3>
            <div className="enquiry-contact">
              <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>
              {enquiry.email && (
                <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
              )}
            </div>
            <div className="enquiry-details">
              <div>
                <span>Flavour</span>
                <b>{enquiry.flavour}</b>
              </div>
              <div>
                <span>Size</span>
                <b>{enquiry.size}</b>
              </div>
              <div>
                <span>Shape / design</span>
                <b>{enquiry.shape}</b>
              </div>
              <div>
                <span>Occasion</span>
                <b>{enquiry.occasion}</b>
              </div>
              <div>
                <span>Preferred date</span>
                <b>{formatDate(enquiry.preferredDate)}</b>
              </div>
              <div>
                <span>Budget</span>
                <b>{enquiry.budgetRange}</b>
              </div>
            </div>
            {enquiry.cakeMessage && (
              <p className="enquiry-message">“{enquiry.cakeMessage}”</p>
            )}
            {enquiry.additionalInstructions && (
              <p className="enquiry-instructions">
                {enquiry.additionalInstructions}
              </p>
            )}
            <label className="enquiry-status">
              Update enquiry
              <select
                value={enquiry.status}
                onChange={e =>
                  update.mutate({
                    id: enquiry.id,
                    status: e.target.value as
                      | "pending"
                      | "contacted"
                      | "accepted"
                      | "rejected",
                  })
                }
              >
                {["pending", "contacted", "accepted", "rejected"].map(
                  status => (
                    <option key={status}>{status}</option>
                  )
                )}
              </select>
            </label>
          </article>
        ))}
      </div>
      {query.data?.length === 0 && (
        <p className="table-empty muted-copy">No cake enquiries yet.</p>
      )}
    </div>
  );
}

function ReviewsManager() {
  const [filter, setFilter] = useState("pending");
  const query = trpc.admin.reviews.useQuery({
    status: filter
      ? (filter as "pending" | "approved" | "rejected")
      : undefined,
  });
  const utils = trpc.useUtils();
  const update = trpc.admin.updateReviewStatus.useMutation({
    onSuccess: () => {
      void utils.admin.reviews.invalidate();
      void utils.catalog.invalidate();
      toast.success("Review moderation updated.");
    },
  });
  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="admin-toolbar-note">
          <span className="eyebrow">KIND WORDS, MODERATED</span>
          <p>Approve customer reviews before they appear on the storefront.</p>
        </div>
        <select
          className="admin-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">Every review</option>
          {["pending", "approved", "rejected"].map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="review-admin-list">
        {query.data?.map(review => (
          <article className="review-admin-card" key={review.id}>
            <div>
              <span className="review-stars">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <span className={`status-pill status-${review.status}`}>
                {review.status}
              </span>
            </div>
            <p>“{review.body}”</p>
            <strong>{review.customerName}</strong>
            <small>{formatDate(review.createdAt)}</small>
            <label>
              Moderate
              <select
                value={review.status}
                onChange={e =>
                  update.mutate({
                    id: review.id,
                    status: e.target.value as
                      | "pending"
                      | "approved"
                      | "rejected",
                  })
                }
              >
                {["pending", "approved", "rejected"].map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>
      {query.data?.length === 0 && (
        <p className="table-empty muted-copy">No reviews in this queue.</p>
      )}
    </div>
  );
}
