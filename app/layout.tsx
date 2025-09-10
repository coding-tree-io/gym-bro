import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "Gym Appointment Booking",
  description: "Savage Barbell booking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-cream min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
