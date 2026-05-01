import brandMark from '../../assets/brand-mark.png';

export default function BrandLogo({ className = '', title = 'YAMU Car Rental' }) {
  const classes = ['brand-logo', className].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-label={title}>
      <span className="brand-logo-mark" aria-hidden="true">
        <img src={brandMark} alt="" />
      </span>
      <span className="brand-logo-copy">
        <span className="brand-logo-word">යමු</span>
      </span>
    </span>
  );
}
