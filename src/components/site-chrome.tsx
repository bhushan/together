import Link from 'next/link';

export function SiteHeader({ onPhoto = false }: { onPhoto?: boolean }) {
  return (
    <header className={onPhoto ? 'site-header shell on-photo' : 'site-header shell'}>
      <Link className="wordmark" href="/">Together</Link>
      <nav>
        <a href="/#how">How it works</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <span>Together: one trip, everyone’s constraints.</span>
      <span>Prices are live estimates, not bookings.</span>
    </footer>
  );
}
