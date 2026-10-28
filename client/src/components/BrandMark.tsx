export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-mark-img ${className}`}
      src="/cakers-mark.svg"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
    />
  );
}
