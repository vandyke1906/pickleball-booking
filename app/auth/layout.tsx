"use client"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="relative z-10">{children}</div>
    </>
  )
}
