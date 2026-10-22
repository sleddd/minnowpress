// Component tests render with the real design tokens and base styles,
// so computed styles and axe's color-contrast checks reflect the actual site.
import '#lib/styles/base.css';

// On the site every component sits on the page card (SiteShell), not the outer frame.
const style = document.createElement('style');
style.textContent = 'body { background: var(--color-bg); }';
document.head.append(style);
