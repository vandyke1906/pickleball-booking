import { useState } from "react"

export const useOpenWalletApp = () => {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const openWalletApp = (wallet: "gcash" | "maya") => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)

    if (!isIOS && !isAndroid) {
      alert("Please use a mobile device (iOS or Android).")
      return
    }

    let deepLink = ""
    let fallbackUrl = ""

    if (wallet === "gcash") {
      deepLink = isAndroid
        ? "intent://#Intent;scheme=gcash;package=com.globe.gcash.android;end"
        : "gcash://"

      fallbackUrl = isIOS
        ? "https://apps.apple.com/ph/app/gcash/id520020791"
        : "https://play.google.com/store/apps/details?id=com.globe.gcash.android"
    } else if (wallet === "maya") {
      deepLink = isAndroid ? "intent://#Intent;scheme=maya;package=com.paymaya;end" : "maya://"

      fallbackUrl = isIOS
        ? "https://apps.apple.com/ph/app/maya-savings-loans-cards/id991673877"
        : "https://play.google.com/store/apps/details?id=com.paymaya"
    }

    setIsRedirecting(true)
    const startTime = Date.now()

    // Critical: Try to open the app
    window.location.href = deepLink

    // Fallback logic
    setTimeout(() => {
      const elapsed = Date.now() - startTime

      if (elapsed < 2000 && document.visibilityState === "visible") {
        window.location.href = fallbackUrl
      } else {
        setIsRedirecting(false)
      }
    }, 1600)
  }

  return { openWalletApp, isRedirecting }
}
