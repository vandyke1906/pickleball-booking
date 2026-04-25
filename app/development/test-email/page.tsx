"use client"

export default function TestEmail() {
  const sendEmail = async () => {
    const res = await fetch("/api/test/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "vandyke1906@gmail.com",
        subject: "Test Email",
        html: "<h1>Hello Ronie 👋</h1><p>This is a test email</p>",
      }),
    })

    const data = await res.json()
    console.log(data)
    alert(JSON.stringify(data))
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={sendEmail}>Send Test Email</button>
    </div>
  )
}
