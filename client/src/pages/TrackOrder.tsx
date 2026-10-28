import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  PackageCheck,
  Search,
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { formatDate, formatRupees } from "../lib/shop";
import { ORDER_STATUS_VALUES } from "../../../shared/shop";

const progressSteps = ORDER_STATUS_VALUES.filter(
  status => status !== "Cancelled"
);
type ProgressStatus = (typeof progressSteps)[number];

export default function TrackOrder() {
  const lookup = trpc.orders.track.useMutation();
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState<Awaited<
    ReturnType<typeof lookup.mutateAsync>
  > | null>(null);
  const activeIndex = useMemo(
    () =>
      details ? progressSteps.indexOf(details.status as ProgressStatus) : -1,
    [details]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setDetails(null);
    try {
      setDetails(await lookup.mutateAsync({ orderCode, phone }));
    } catch {
      // The mutation's safe error message is displayed above the submit button.
    }
  };

  return (
    <section className="track-page wrap">
      <div className="track-card">
        <span className="track-icon">
          <PackageCheck size={23} />
        </span>
        <span className="eyebrow">FROM OUR KITCHEN TO YOU</span>
        <h1>
          Where’s your <em>cake?</em>
        </h1>
        <p>
          Enter your order ID and the phone number used at checkout. We’ll only
          show a matching order.
        </p>
        <form className="track-form" onSubmit={submit}>
          <label>
            Order ID
            <input
              required
              minLength={8}
              maxLength={32}
              value={orderCode}
              onChange={e => setOrderCode(e.target.value.toUpperCase())}
              placeholder="CKR-XXXXXXXXXX"
            />
          </label>
          <label>
            Checkout phone number
            <input
              required
              minLength={7}
              maxLength={32}
              pattern="[+()0-9 .-]{7,32}"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="The phone number on your order"
            />
          </label>
          {lookup.error && <p className="form-error">{lookup.error.message}</p>}
          <button className="button button-primary" disabled={lookup.isPending}>
            {lookup.isPending ? (
              <>
                <LoaderCircle className="spin" /> Looking it up…
              </>
            ) : (
              <>
                Track my order <Search size={16} />
              </>
            )}
          </button>
        </form>
      </div>
      {details && (
        <div className="tracking-result">
          <div className="tracking-result-head">
            <span className="eyebrow">ORDER {details.orderCode}</span>
            <span className="status-pill status-current">
              <Check size={14} />
              {details.status}
            </span>
          </div>
          <p className="tracking-date">
            Placed {formatDate(details.createdAt)} · Delivery{" "}
            {formatDate(details.deliveryDate)} · {details.deliveryTime}
          </p>
          <div className="status-track">
            {progressSteps.map((status, index) => {
              const active = index <= activeIndex;
              return (
                <div
                  className={`status-step ${active ? "done" : ""}`}
                  key={status}
                >
                  <span>{active ? <Check size={14} /> : null}</span>
                  <small>{status}</small>
                </div>
              );
            })}
          </div>
          {details.status === "Cancelled" && (
            <div className="status-cancelled">
              This order was cancelled. Please contact our bakery if you need a
              hand.
            </div>
          )}
          <div className="tracked-items">
            <h3>On the order</h3>
            {details.items.map((item, index) => (
              <div key={`${item.productName}-${index}`}>
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <b>{formatRupees(item.unitPricePaise * item.quantity)}</b>
              </div>
            ))}
          </div>
          <p className="privacy-note">
            This view does not show your address, email or other personal
            details.
          </p>
        </div>
      )}
      <a href="tel:+918012345678" className="track-help">
        Need a hand? Call our bakery <ArrowRight size={14} />
      </a>
    </section>
  );
}
