export function isMobileOrTablet(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // 1. Android/iOS standard checks
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return true;
  }

  // 2. iPad OS 13+ detection (which identifies as Macintosh but has touch points)
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh/.test(userAgent)) {
    return true;
  }

  // 3. Smaller viewports with touch capabilities (usually tablets)
  if (window.innerWidth <= 1024 && navigator.maxTouchPoints && navigator.maxTouchPoints > 0) {
    return true;
  }

  return false;
}
