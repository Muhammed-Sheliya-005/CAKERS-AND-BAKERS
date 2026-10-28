import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CakeSlice,
  LoaderCircle,
  LogOut,
  PackageCheck,
  Save,
  UserRound,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { startLogin } from "../const";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { formatDate, formatRupees } from "../lib/shop";

export default function Account() {
  const { user, loading, logout } = useAuth();
  const orders = trpc.orders.mine.useQuery(undefined, { enabled: !!user });
  const profile = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const save = trpc.auth.updateProfile.useMutation();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const account = profile.data;
    if (!account || initialized) return;
    setPhone(account.phone || "");
    setAddress(account.defaultAddress || "");
    setInitialized(true);
  }, [profile.data, initialized]);
  if (loading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" />
        Checking your account…
      </div>
    );
  if (!user)
    return (
      <section className="account-gate wrap">
        <span className="account-gate-icon">
          <UserRound size={24} />
        </span>
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h1>
          Good to have you <em>here.</em>
        </h1>
        <p>
          Sign in with your Manus account to save your contact details, leave a
          cake review and see your order history. You can always checkout as a
          guest.
        </p>
        <button className="button button-primary" onClick={() => startLogin()}>
          Sign in or create account <ArrowRight size={16} />
        </button>
        <span className="muted-copy">
          Your account is protected by the project’s real sign-in flow.
        </span>
      </section>
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({ phone, defaultAddress: address });
      await profile.refetch();
      toast.success("Your details have been saved.");
    } catch {
      toast.error("We couldn’t save those details just now.");
    }
  };
  return (
    <section className="page-wrap wrap account-page">
      <div className="page-intro compact-intro">
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h1>Hello, {user.name?.split(" ")[0] || "cake person"}.</h1>
        <p>
          Your saved details and the cakes you’ve ordered through Cakers &
          Cakers.
        </p>
      </div>
      <div className="account-layout">
        <form className="account-profile form-card" onSubmit={submit}>
          <div className="form-card-heading">
            <span>
              <UserRound size={19} />
            </span>
            <div>
              <h2>Your details</h2>
              <p>Saved securely to your account.</p>
            </div>
          </div>
          <label>
            Account name
            <input readOnly value={user.name || "Manus user"} />
          </label>
          <label>
            Email
            <input readOnly value={user.email || ""} />
          </label>
          <label>
            Phone
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              maxLength={32}
              placeholder="+91 98765 43210"
            />
          </label>
          <label>
            Saved delivery address
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="House number, street, Bengaluru"
            />
          </label>
          <button className="button button-outline" disabled={save.isPending}>
            {save.isPending ? (
              <LoaderCircle className="spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            Save details
          </button>
          <button
            className="sign-out-button"
            type="button"
            onClick={() => void logout()}
          >
            <LogOut size={15} /> Sign out
          </button>
        </form>
        <div className="account-orders">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE ORDER BOOK</span>
              <h2>
                Your <em>orders.</em>
              </h2>
            </div>
            <Link href="/track-order" className="text-link">
              Track an order <ArrowRight size={15} />
            </Link>
          </div>
          {orders.isLoading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" />
              Loading your order book…
            </div>
          ) : orders.data?.length ? (
            <div className="account-order-list">
              {orders.data.map(order => (
                <article className="account-order" key={order.id}>
                  <div className="account-order-head">
                    <span>
                      <PackageCheck size={17} /> {order.orderCode}
                    </span>
                    <span className="status-pill">{order.status}</span>
                  </div>
                  <div className="account-order-meta">
                    <span>Placed {formatDate(order.createdAt)}</span>
                    <span>Delivery {formatDate(order.deliveryDate)}</span>
                    <b>{formatRupees(order.totalPaise)}</b>
                  </div>
                  <div className="account-order-items">
                    {order.items.map((item, index) => (
                      <span key={`${item.productNameSnapshot}-${index}`}>
                        <CakeSlice size={14} />
                        {item.productNameSnapshot} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-order-state">
              <PackageCheck size={24} />
              <h3>No orders in the book yet.</h3>
              <p>When you place an order while signed in, it’ll appear here.</p>
              <Link href="/shop" className="text-link">
                Find a cake <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
