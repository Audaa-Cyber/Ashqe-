import type { Metadata } from "next"
import { Bricolage_Grotesque, Manrope, IBM_Plex_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" })
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" })
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] })

export const metadata: Metadata = {
  title: "Ashqe — Your AI operating system for X",
  description: "Research, discover, grow and operate your presence on X with a personal AI agent.",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background scroll-smooth">
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
