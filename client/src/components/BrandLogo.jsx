export default function BrandLogo({ className = '', title = 'YAMU Car Rental' }) {
  const classes = ['brand-logo', className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="img" aria-label={title}>
      <svg
        viewBox="0 0 320 70"
        aria-hidden="true"
        focusable="false"
      >
        <title>{title}</title>
        <path
          className="brand-logo-outline"
          d="M18 40h18l12-2 24-15 16-10c7-4 14-6 22-6h58c11 0 21 3 29 10l17 13 15 3c6 1 10 5 11 11h-17"
        />
        <path
          className="brand-logo-outline"
          d="M81 21h65c8 0 14 2 20 7l14 10H62l14-10c6-5 12-7 19-7Z"
        />
        <path
          className="brand-logo-outline"
          d="M114 21l-10 17m23-17 14 17M18 40h20m30 0h114m38 0h21"
        />
        <circle className="brand-logo-wheel" cx="56" cy="46" r="10" />
        <circle className="brand-logo-hub" cx="56" cy="46" r="2.4" />
        <circle className="brand-logo-wheel" cx="209" cy="46" r="10" />
        <circle className="brand-logo-hub" cx="209" cy="46" r="2.4" />
        <text className="brand-logo-type" x="268" y="43" textAnchor="middle">
          YAMU
        </text>
      </svg>
    </span>
  )
}
