import type React from "react"
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-sans bg-white text-black">{children}</div>
}
