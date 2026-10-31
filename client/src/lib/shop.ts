export const formatRupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
export const formatDate = (value: string | Date, timeZone = "Asia/Kolkata") => {
  const raw = value instanceof Date ? value.toISOString() : value;
  const isCalendarDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: isCalendarDate ? "UTC" : timeZone,
  }).format(new Date(isCalendarDate ? `${raw}T00:00:00.000Z` : raw));
};
export const todayString = (timeZone = "Asia/Kolkata") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const tomorrowString = (timeZone = "Asia/Kolkata") => {
  const date = new Date(`${todayString(timeZone)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
