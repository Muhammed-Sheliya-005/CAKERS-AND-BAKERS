import { Check, PackageCheck, Search } from "lucide-react";
import { Link, useRoute } from "wouter";
import { formatRupees } from "../lib/shop";

type Receipt = {
  orderCode: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
};
export default function OrderConfirmation() {
  const [, params] = useRoute("/order-confirmation/:orderCode");
  const code = params?.orderCode || "";
  let receipt: Receipt | null = null;
  try {
    const parsed = JSON.parse(
      sessionStorage.getItem("cakers-last-receipt") || "null"
    ) as Receipt | null;
    if (parsed?.orderCode === code) receipt = parsed;
  } catch {
    receipt = null;
  }
  return (
    <section className="confirmation-page wrap">
      <div className="confirmation-card">
        <span className="confirmation-icon">
          <Check size={29} />
        </span>
        <span className="eyebrow">A LOVELY CHOICE</span>
        <h1>
          Your order is <em>in!</em>
        </h1>
        <p>
          We’ve passed your note to the kitchen. Your cake is now on its way
          through our order book.
        </p>
        <div className="order-number">
          <span>YOUR ORDER ID</span>
          <strong>{code}</strong>
          <small>Keep this handy when you track your order.</small>
        </div>
        {receipt && (
          <div className="receipt-lines">
            <span>
              Items <b>{formatRupees(receipt.subtotalPaise)}</b>
            </span>
            <span>
              Delivery{" "}
              <b>
                {receipt.deliveryFeePaise === 0
                  ? "On us"
                  : formatRupees(receipt.deliveryFeePaise)}
              </b>
            </span>
            <span className="receipt-total">
              Total <b>{formatRupees(receipt.totalPaise)}</b>
            </span>
          </div>
        )}
        <div className="payment-note">
          <PackageCheck size={18} />
          <span>
            <strong>Cash on Delivery / pay at store</strong>
            <small>No online payment was taken.</small>
          </span>
        </div>
        <div className="confirmation-actions">
          <Link href="/track-order" className="button button-primary">
            Track your order <Search size={16} />
          </Link>
          <Link href="/shop" className="button button-outline">
            Back to the shop
          </Link>
        </div>
      </div>
    </section>
  );
}
