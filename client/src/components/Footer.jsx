import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-bottom">
          <BrandLogo className="footer-logo" />
          <p>&copy; {new Date().getFullYear()} YAMU Car Rental.</p>
        </div>
      </div>
    </footer>
  );
}
