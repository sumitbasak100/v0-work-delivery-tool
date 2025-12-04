import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Review Project - Sendro",
  description: "Review and approve files",
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
