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

  // If already dismissed, or not Safari, just render children
  if (dismissed) return <>{children}</>;

  // iOS Safari — strong redirect
  if (isIOSSafari()) {
    return (
      <div className="fixed inset-0 bg-[#f5f5f0] z-[100] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-[#5A5A40]/10 rounded-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5A5A40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="21.17" y1="8" x2="12" y2="8" />
              <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
              <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#5A5A40] font-serif">
            Works best in Chrome
          </h2>
          <p className="text-gray-500 text-lg font-serif">
            The voice assistant and microphone work more reliably in Chrome on iOS.
          </p>
          <a
            href={getChromeUrl()}
            className="block w-full py-5 bg-[#5A5A40] text-white text-xl font-bold rounded-full shadow-lg hover:bg-[#4A4A30] active:scale-[0.98] transition-all"
          >
            Open in Chrome
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 text-sm underline"
          >
            Continue in Safari anyway
          </button>
        </div>
      </div>
    );
  }

  // Desktop Safari — softer banner
  if (isDesktopSafari()) {
    return (
      <>
        <div className="fixed top-0 inset-x-0 z-[100] bg-[#5A5A40] text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-3">
          <span>For the best voice experience, use Chrome.</span>
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

  // Not Safari — render normally
  return <>{children}</>;
}
