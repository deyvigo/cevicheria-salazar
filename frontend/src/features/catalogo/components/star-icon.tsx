export function StarIcon({ className }: { className: string }) {
  return (
    // The stroke in the same color as the fill is what rounds the tips; the viewBox leaves room for it
    <svg
      viewBox="1 0.1 18 18"
      aria-hidden="true"
      className={`flex-none fill-naranja-500 stroke-naranja-500 ${className}`}
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
    </svg>
  );
}
