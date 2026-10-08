import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Miss America Logotype Generator",
  description: "Generate official Miss America state and local title logotypes",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
