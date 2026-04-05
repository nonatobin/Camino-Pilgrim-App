import React, { useState } from 'react';

/**
 * Detects if the user is on iOS Safari and offers a one-tap redirect to Chrome.
 * On iOS, the `googlechrome://` URL scheme opens Chrome directly.
 * On Android, Chrome is usually the default so no redirect is needed.
 * On desktop, Safari works fine for everything except voice — we show a softer nudge.
 */

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|Chrome|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isDesktopSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  const isDesktop = !/iPad|iPhone|iPod|Android/.test(ua) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isSafari && isDesktop;
}

function getChromeUrl(): string {
  // On iOS, googlechromes:// opens Chrome with https, googlechrome:// with http
  const currentUrl = window.location.href;
  if (currentUrl.startsWith('https://')) {
    return currentUrl.replace('https://', 'googlechromes://');
  }
  return currentUrl.replace('http://', 'googlechrome://');
}

export default function ChromeRedirect({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);

  // If already dismissed, render children normally
  if (dismissed) return <>{children}</>;

  // On iOS Safari: do NOT show any banner. Safari is REQUIRED for PWA install.
  // Only show Chrome recommendation on Desktop Safari where voice APIs are limited.
  if (isDesktopSafari()) {
    return (
      <>
        <div className="fixed top-0 inset-x-0 z-[100] bg-[#5A5A40] text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-3">
          <span>For the best voice experience, we recommend Chrome.</span>
          <button
            onClick={() => setDismissed(true)}
            className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold hover:bg-white/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
        <div className="pt-12">
          {children}
        </div>
      </>
    );
  }

  // iOS Safari or any non-Safari browser — render normally
  return <>{children}</>;
}
