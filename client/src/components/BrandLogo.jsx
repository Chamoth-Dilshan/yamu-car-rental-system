export default function BrandLogo({ className = '', title = 'YAMU Car Rental' }) {
  const classes = ['brand-logo', className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="img" aria-label={title}>
      <svg
        viewBox="0 0 240 80"
        aria-hidden="true"
        focusable="false"
      >
        <title>{title}</title>
        <path
          className="brand-logo-outline"
          d="M18 50h16l12-2 18-13 16-12c6-5 13-7 21-7h58c10 0 19 3 26 9l16 13 15 3c5 1 8 4 10 8"
        />
        <path
          className="brand-logo-outline"
          d="M18 50h14c3 0 5 2 5 5v1m28-6h25m68 0h21m29-10h10c4 0 7 3 7 7v5m0 0h-13"
        />
        <path
          className="brand-logo-outline"
          d="M74 33h30m30 0h18m-70 0-8 11c-2 3-5 4-9 4H57m95-15 16 15h31"
        />
        <circle className="brand-logo-wheel" cx="54" cy="56" r="11" />
        <circle className="brand-logo-wheel" cx="54" cy="56" r="4.5" />
        <circle className="brand-logo-wheel" cx="201" cy="56" r="11" />
        <circle className="brand-logo-wheel" cx="201" cy="56" r="4.5" />
        <text className="brand-logo-type" x="124" y="50" textAnchor="middle">
          YAMU
        </text>
      </svg>
    </span>
  )
}
