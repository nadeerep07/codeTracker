import type React from "react"
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-sans bg-white text-black">{children}</div>
}
