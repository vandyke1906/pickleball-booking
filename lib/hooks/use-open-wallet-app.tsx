import { useState } from "react"
import { toast } from "sonner" // or your toast library

export const useOpenWalletApp = () => {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const openWalletApp = (wallet: "gcash" | "maya" | "bdo") => {
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)

    if (!isIOS && !isAndroid) {
      toast.error("Please open this on a mobile device.")
      return
    }

    let deepLink = ""
    switch (wallet) {
      case "gcash":
        deepLink = isAndroid
          ? "intent://#Intent;scheme=gcash;package=com.globe.gcash.android;end"
          : "gcash://"
        break
      case "maya":
        deepLink = isAndroid ? "intent://#Intent;scheme=maya;package=com.paymaya;end" : "maya://"
        break
      case "bdo":
        deepLink = isAndroid
          ? "intent://#Intent;scheme=bdo://;package=ph.com.bdo.retail;end"
          : "bdopay://"
        break
    }

    setIsRedirecting(true)
    const loadingToastId = toast.loading("Opening wallet app…")
    const start = Date.now()

    if (isIOS) {
      window.location.href = deepLink
    } else {
      window.location.assign(deepLink)
    }

    // Check if app opened
    setTimeout(() => {
      const elapsed = Date.now() - start

      if (document.visibilityState === "visible" && elapsed < 2500) {
        toast.dismiss(loadingToastId)
        toast.info("App not detected. Please make sure the app is installed.")
        setIsRedirecting(false)
        return
      }

      toast.dismiss(loadingToastId)
      setIsRedirecting(false)
    }, 1800)
  }

  return { openWalletApp, isRedirecting }
}
