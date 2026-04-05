import React, { useState, useEffect } from 'react';
import { Download, Share, X, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSNonSafari, setIsIOSNonSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // 1. Check if we are already installed
    // 'standalone' is true if the app is launched from the homescreen
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // If already installed, don't show the prompt
    if (isPWA) return;

    // 2. Device Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isChromeIOS = userAgent.includes('crios');
    const isFirefoxIOS = userAgent.includes('fxios');
    
    setIsIOS(isIOSDevice);
    setIsIOSNonSafari(isIOSDevice && (isChromeIOS || isFirefoxIOS));

    if (isIOSDevice) {
      // For iOS, there is no event to hook into. We must just show the UI guide.
      // We delay it slightly so it pops up warmly after initial render.
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }

    // 3. Android Installation Hook
    // Chrome fires 'beforeinstallprompt' if the app meets PWA criteria
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); // Show the native Android install prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const [iosStep, setIosStep] = useState(0);

  const iosStepData = [
    {
      number: 1,
      icon: '⬆️',
      title: 'Find the Share button',
      description: 'Look at the very bottom of your Safari screen. Tap the square icon with an arrow pointing up.',
      highlight: 'It\'s the box with an upward arrow ⬆️',
    },
    {
      number: 2,
      icon: '➕',
      title: 'Add to Home Screen',
      description: 'A menu will appear. Scroll down in that menu until you see "Add to Home Screen" with a ➕ icon. Tap it.',
      highlight: 'You may need to scroll down to find it',
    },
    {
      number: 3,
      icon: '✅',
      title: 'Tap "Add"',
      description: 'You\'ll see the app name "Camino". Tap the blue "Add" button in the top right corner. Done! The app icon will appear on your home screen.',
      highlight: 'Look for the blue "Add" in the top right',
    },
  ];

  const iOSInstructions = (
    <div className="flex flex-col items-center text-center space-y-5">
      <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center">
        <Share size={32} className="text-[#5A5A40]" />
      </div>
      <h3 className="text-2xl font-bold text-[#1a1a1a]">Install App to iPhone</h3>

      {isIOSNonSafari ? (
        <div className="bg-red-50 p-5 rounded-xl border border-red-100">
          <p className="text-lg text-red-800 leading-relaxed font-bold mb-2">
            ⚠️ You're using Chrome on iPhone
          </p>
          <p className="text-md text-red-700 font-medium mb-4">
            Apple requires <strong>Safari</strong> to install apps to your Home Screen.
          </p>
          <div className="bg-white p-4 rounded-lg text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">1</span>
              <p className="text-sm text-gray-700 pt-1">Copy this URL from the address bar</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">2</span>
              <p className="text-sm text-gray-700 pt-1">Open <strong>Safari</strong> (the blue compass icon)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">3</span>
              <p className="text-sm text-gray-700 pt-1">Paste the URL and press Go</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {/* Step card */}
          <motion.div
            key={iosStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#f5f5f0] rounded-2xl p-6 text-left border border-[#5A5A40]/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#5A5A40] text-white rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                {iosStepData[iosStep].number}
              </div>
              <span className="text-4xl">{iosStepData[iosStep].icon}</span>
            </div>
            <h4 className="text-xl font-bold text-[#1a1a1a] mb-2">{iosStepData[iosStep].title}</h4>
            <p className="text-gray-600 text-lg leading-relaxed mb-3">{iosStepData[iosStep].description}</p>
            <p className="text-[#5A5A40] font-bold text-sm bg-[#5A5A40]/10 px-3 py-2 rounded-lg inline-block">
              💡 {iosStepData[iosStep].highlight}
            </p>
          </motion.div>

          {/* Step dots + navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {iosStepData.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${i === iosStep ? 'bg-[#5A5A40]' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            {iosStep < iosStepData.length - 1 ? (
              <button
                onClick={() => setIosStep(iosStep + 1)}
                className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-bold text-lg flex items-center gap-2 active:scale-95 transition-transform"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={() => setShowPrompt(false)}
                className="bg-green-600 text-white px-6 py-3 rounded-full font-bold text-lg flex items-center gap-2 active:scale-95 transition-transform"
              >
                ✅ Got it!
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const AndroidInstructions = (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
        <Download size={32} />
      </div>
      <h3 className="text-2xl font-bold text-[#1a1a1a]">Install App Base</h3>
      <p className="text-xl text-gray-600 leading-relaxed font-medium">
        Install the Camino App to your home screen for quick, offline-ready access.
      </p>
      <button 
        onClick={handleInstallClick}
        className="w-full bg-[#1a1a1a] text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl mt-4"
      >
        <Download size={24} /> Install Camino App
      </button>
    </div>
  );

  // If app is installed, or the prompt isn't ready to show, render a tiny floating QR button instead
  // so testers can share the app with other testers right next to them easily.
  if (isStandalone || !showPrompt) {
    if (isStandalone) return null; // Fully installed, hide everything.
    return (
        <button 
          onClick={() => setShowQR(true)}
          className="fixed top-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-sm border border-black/5 z-50 text-gray-500"
        >
          <QrCode size={20} />
        </button>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 pb-20 sm:p-6">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPrompt(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors"
              >
                <X size={20} />
              </button>

              {isIOS ? iOSInstructions : AndroidInstructions}
              
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <button 
                  onClick={() => setShowQR(true)}
                  className="text-[#5A5A40] font-bold underline flex items-center justify-center gap-2 mx-auto"
                >
                  <QrCode size={18} /> Or show QR Code to scan it on another phone
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full relative text-center"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">Scan to Install</h3>
              <div className="bg-gray-50 p-4 rounded-2xl mb-4">
                <img src="/qrcode.svg" alt="Camino App QR Code — Scan to install" className="w-full rounded-xl" />
              </div>
              <p className="text-gray-500 font-medium">Use any iPhone or Android camera to open the app directly.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
