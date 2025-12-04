import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Sendro - Work Delivery & Client Approval",
    template: "%s | Sendro",
  },
  description: "The simplest way to deliver files to clients and collect approvals. No client login required.",
  keywords: [
    "file delivery",
    "client approval",
    "freelancer tools",
    "creative workflow",
    "file review",
    "project management",
  ],
  authors: [{ name: "Sendro" }],
  creator: "Sendro",
  metadataBase: new URL("https://sendro.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Sendro",
    title: "Sendro - Work Delivery & Client Approval",
    description: "The simplest way to deliver files to clients and collect approvals. No client login required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sendro - Work Delivery & Client Approval",
    description: "The simplest way to deliver files to clients and collect approvals. No client login required.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
