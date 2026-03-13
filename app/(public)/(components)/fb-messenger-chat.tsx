"use client"

import { useEffect } from "react"

export default function MessengerChat() {
  useEffect(() => {
    // Only inject the SDK script once
    if (document.getElementById("facebook-jssdk")) return

    window.fbAsyncInit = function () {
      FB.init({
        xfbml: true,
        version: "v18.0",
      })
    }

    const js = document.createElement("script")
    js.id = "facebook-jssdk"
    js.src = "https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js"
    document.body.appendChild(js)
  }, [])

  return (
    <>
      <div id="fb-root"></div>
      <div
        className="fb-customerchat"
        attribution="setup_tool"
        page_id={process.env.NEXT_PUBLIC_FB_PAGE_ID} // your Page ID
        theme_color="#13310b"
        logged_in_greeting="Hi! How can we help you?"
        logged_out_greeting="Hi! Please log in to chat with us."
      ></div>
    </>
  )
}
