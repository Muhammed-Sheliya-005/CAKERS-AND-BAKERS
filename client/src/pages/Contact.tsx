import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MapPin, Phone, Clock3, Mail } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

export default function Contact() {
  const business = trpc.storefront.businessProfile.useQuery();
  const submit = trpc.storefront.submitEnquiry.useMutation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone.trim() && !email.trim()) { toast.error("Add a phone number or email so we can reply."); return; }
    try {
      await submit.mutateAsync({ customerName: name, phone, email, subject, message });
      setSent(true);
      setName(""); setPhone(""); setEmail(""); setSubject(""); setMessage("");
      toast.success("Your message has reached the bakery team.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Your message could not be sent. Please try again."); }
  };
  return (
    <section className="page-wrap wrap contact-page">
      <div className="page-intro compact-intro"><span className="eyebrow">A NOTE TO THE BAKERY</span><h1>Let’s make <em>something lovely.</em></h1><p>Questions, celebration plans or a little cake dilemma? Send the team a note.</p></div>
      <div className="contact-layout">
        <aside className="contact-business-card"><span className="eyebrow">COME SAY HELLO</span><h2>{business.data?.businessName ?? "Cakers & Cakers"}</h2><div className="contact-info-row"><MapPin size={18} /><span>{business.data?.businessAddress ?? "Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060."}</span></div><div className="contact-info-row"><Clock3 size={18} /><span>{business.data?.openingHours ?? "Opening hours are being updated."}</span></div>{business.data?.contactPhone && <a className="contact-info-row" href={`tel:${business.data.contactPhone}`}><Phone size={18} /><span>{business.data.contactPhone}</span></a>}{business.data?.contactEmail && <a className="contact-info-row" href={`mailto:${business.data.contactEmail}`}><Mail size={18} /><span>{business.data.contactEmail}</span></a>}<div className="contact-fulfilment-note"><b>Ordering for a date?</b><p>For a tailored design, use our custom-cake request form. For ready-to-order favourites, the live checkout will show the current delivery and pickup options.</p><Link href="/custom-cake">Request a custom cake <ArrowRight size={14} /></Link></div>{business.isLoading && <small className="muted-copy">Loading current shop details…</small>}</aside>
        <form className="form-card contact-enquiry-form" onSubmit={onSubmit}>
          <div className="form-card-heading"><span>01</span><div><h2>Write us a note</h2><p>Your message goes straight to the bakery team.</p></div></div>
          {sent && <div className="contact-success" role="status"><b>Message received.</b><span>Thank you for getting in touch; the team can now follow up with you.</span></div>}
          <div className="form-grid"><label>Your name<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label><label>Phone number <small>(or provide email)</small><input type="tel" minLength={phone ? 7 : undefined} maxLength={32} pattern={phone ? "[+()0-9 .-]{7,32}" : undefined} value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="+91 98765 43210" /></label><label className="full-span">Email address <small>(phone or email is required)</small><input type="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></label><label className="full-span">Subject<input required minLength={3} maxLength={160} value={subject} onChange={event => setSubject(event.target.value)} placeholder="What would you like to ask?" /></label><label className="full-span">Message<textarea required minLength={10} maxLength={4000} rows={6} value={message} onChange={event => setMessage(event.target.value)} placeholder="Add the details the bakery team will need…" /></label></div>
          <button className="button button-primary" disabled={submit.isPending}>{submit.isPending ? <><LoaderCircle className="spin" size={16} /> Sending…</> : <>Send my enquiry <ArrowRight size={16} /></>}</button>
          {submit.error && <p className="form-error" role="alert">{submit.error.message}</p>}
          <p className="checkout-privacy">Your contact details are used only to reply to this enquiry and fulfil your request.</p>
        </form>
      </div>
    </section>
  );
}
