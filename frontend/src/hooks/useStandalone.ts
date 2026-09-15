import { useEffect, useState } from 'react';

/**
 * True when the app is running installed (Add to Home Screen / PWA),
 * not inside a regular browser tab. Used to hide the decorative fake
 * status bar we draw for the desktop "phone preview" frame -- once the
 * app is actually installed, the OS provides a real status bar and a
 * second, hardcoded one (fake battery %, fake signal bars) would just
 * look wrong sitting under it.
 */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const update = () => setStandalone(isStandalone());
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return standalone;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia?.('(display-mode: standalone)').matches || iosStandalone === true;
}
