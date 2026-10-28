import { FormEvent, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { tomorrowString } from "../lib/shop";

export default function CustomCake() {
  const submitRequest = trpc.customCake.submit.useMutation();
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submitRequest.mutateAsync({
        customerName: String(form.get("name")),
        phone: String(form.get("phone")),
        email: String(form.get("email") || ""),
        flavour: String(form.get("flavour")),
        size: String(form.get("size")),
        shape: String(form.get("shape")),
        occasion: String(form.get("occasion")),
        cakeMessage: String(form.get("cakeMessage") || ""),
        preferredDate: String(form.get("preferredDate")),
        budgetRange: String(form.get("budgetRange")),
        additionalInstructions: String(form.get("instructions") || ""),
      });
      setSuccess(true);
      toast.success("Your cake enquiry is with the bakery.");
      formElement.reset();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "We couldn’t send your enquiry. Please try again."
      );
    }
  };
  return (
    <section className="custom-page">
      <div className="custom-page-hero">
        <div className="wrap custom-page-heading">
          <span className="eyebrow">
            <Sparkles size={14} /> MADE FOR YOUR MOMENT
          </span>
          <h1>
            Let’s dream up
            <br />
            <em>your cake.</em>
          </h1>
          <p>
            Tell us a little about the occasion. Our bakers will get back to you
            to make a plan together.
          </p>
        </div>
      </div>
      <div className="wrap custom-form-layout">
        <aside className="custom-side-note">
          <span className="custom-side-icon">✳</span>
          <h2>
            Little details
            <br />
            make it <em>yours.</em>
          </h2>
          <p>
            From favourite flavours to the message on top, this is your chance
            to make something personal.
          </p>
          <div className="custom-note-row">
            <Check size={15} /> Made fresh for your occasion
          </div>
          <div className="custom-note-row">
            <Check size={15} /> We’ll confirm details before baking
          </div>
          <div className="custom-note-row">
            <Check size={15} /> No payment needed for an enquiry
          </div>
        </aside>
        <form className="custom-form" onSubmit={submit}>
          <div className="form-card-heading">
            <span>01</span>
            <div>
              <h2>The essentials</h2>
              <p>So we can get back to you.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Name"
              />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                required
                minLength={7}
                maxLength={32}
                pattern="[+()0-9 .-]{7,32}"
                placeholder="+91 98765 43210"
              />
            </label>
            <label className="full-span">
              Email <small>(optional)</small>
              <input
                type="email"
                name="email"
                maxLength={320}
                placeholder="you@example.com"
              />
            </label>
          </div>
          <div className="form-divider" />
          <div className="form-card-heading">
            <span>02</span>
            <div>
              <h2>The cake itself</h2>
              <p>Give us the first few ingredients of your idea.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Flavour
              <select name="flavour" required defaultValue="">
                <option value="" disabled>
                  Choose a flavour
                </option>
                <option>Vanilla bean</option>
                <option>Chocolate</option>
                <option>Strawberry</option>
                <option>Butterscotch</option>
                <option>Red velvet</option>
                <option>Pistachio & rose</option>
                <option>Lemon</option>
                <option>Other — let’s discuss</option>
              </select>
            </label>
            <label>
              Size or weight
              <select name="size" required defaultValue="">
                <option value="" disabled>
                  Choose a size
                </option>
                <option>½ kg — serves 4–6</option>
                <option>1 kg — serves 8–10</option>
                <option>1.5 kg — serves 12–15</option>
                <option>2 kg — serves 16–20</option>
                <option>Let’s work it out</option>
              </select>
            </label>
            <label>
              Shape & design
              <input
                name="shape"
                required
                minLength={2}
                maxLength={100}
                placeholder="Round, floral, simple…"
              />
            </label>
            <label>
              What are we celebrating?
              <select name="occasion" required defaultValue="">
                <option value="" disabled>
                  Choose an occasion
                </option>
                <option>Birthday</option>
                <option>Anniversary</option>
                <option>Wedding</option>
                <option>Baby shower</option>
                <option>Graduation</option>
                <option>Other celebration</option>
              </select>
            </label>
            <label className="full-span">
              A little message on top{" "}
              <small>(optional, up to 140 characters)</small>
              <input
                name="cakeMessage"
                maxLength={140}
                placeholder="Happy birthday, Mira!"
              />
            </label>
            <label>
              Preferred delivery or pickup date
              <input
                name="preferredDate"
                type="date"
                required
                min={tomorrowString()}
                defaultValue={tomorrowString()}
              />
            </label>
            <label>
              Budget range
              <input
                name="budgetRange"
                required
                maxLength={100}
                placeholder="Around ₹1,500–₹2,000"
              />
            </label>
            <label className="full-span">
              Anything else we should know? <small>(optional)</small>
              <textarea
                name="instructions"
                maxLength={1500}
                rows={4}
                placeholder="Colours, a reference you’d like to describe, allergies, or a helpful detail…"
              />
            </label>
          </div>
          <p className="custom-upload-note">
            For this demonstration, reference-image uploads are not enabled. You
            can describe your idea above and our team will follow up.
          </p>
          {errorText && <p className="form-error">{errorText}</p>}
          {success && (
            <div className="form-success">
              <Check size={18} />
              <span>
                Your enquiry is saved. Our bakery team will be in touch soon.
              </span>
            </div>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={submitRequest.isPending}
          >
            {submitRequest.isPending ? (
              <>
                <LoaderCircle className="spin" /> Sending your idea…
              </>
            ) : (
              <>
                Send my cake idea <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
