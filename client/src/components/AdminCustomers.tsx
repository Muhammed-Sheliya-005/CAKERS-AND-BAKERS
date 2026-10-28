import { useState } from "react";
import { LoaderCircle, Search, Users } from "lucide-react";
import { trpc } from "../lib/trpc";
import { formatDate, formatRupees } from "../lib/shop";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const query = trpc.admin.customers.useQuery({ search: search || undefined });
  return (
    <section className="admin-panel admin-customers-panel">
      <div className="admin-toolbar admin-customers-toolbar">
        <div className="admin-toolbar-note">
          <span className="eyebrow">REGISTERED SHOP ACCOUNTS</span>
          <p>Customer records are visible to authorised administrators only.</p>
        </div>
        <label className="admin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Find by name, email or phone…"
          />
        </label>
      </div>
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">THE PEOPLE WHO LOVE CAKE</span>
          <h2>
            Your <em>customers.</em>
          </h2>
        </div>
        <span className="table-count">{query.data?.length ?? 0} accounts</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>CUSTOMER</th>
              <th>CONTACT</th>
              <th>ACCOUNT</th>
              <th>ORDERS</th>
              <th>ORDER VALUE</th>
              <th>LAST SIGN-IN</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map(customer => (
              <tr key={customer.id}>
                <td>
                  <b className="customer-table-name">
                    {customer.name || "Cake-shop customer"}
                  </b>
                </td>
                <td>
                  {customer.email || "—"}
                  <small>{customer.phone || "Phone not saved"}</small>
                </td>
                <td>{formatDate(customer.createdAt)}</td>
                <td>{customer.orderCount}</td>
                <td>{formatRupees(customer.orderValuePaise)}</td>
                <td>{formatDate(customer.lastSignedIn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading && (
          <div className="loading-state">
            <LoaderCircle className="spin" />
            Finding customer records…
          </div>
        )}
        {query.error && <p className="form-error">{query.error.message}</p>}
        {!query.isLoading && !query.data?.length && (
          <div className="customers-empty">
            <Users size={24} />
            <span>
              {search
                ? "No customer accounts match that search."
                : "No customer accounts have signed in yet."}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
