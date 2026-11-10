import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { CREATOR } from "@/lib/creator";
import { RevealObserver } from "@/components/motion/reveal-observer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SDG Impact Hub", template: "%s · SDG Impact Hub" },
  description:
    "Join projects, volunteer and measure your verified contribution to the UN Sustainable Development Goals.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  authors: [{ name: CREATOR.name, url: CREATOR.linkedin }],
  creator: CREATOR.name,
  publisher: CREATOR.name,
  openGraph: { title: "SDG Impact Hub", description: "Turn care for the 17 Global Goals into measurable, verified action.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#14532d", width: "device-width", initialScale: 1 };

// Runs before first paint: turns motion on unless the visitor asked for Reduce motion or Save-Data.
const MOTION_SCRIPT = `(function(h){try{var c=navigator.connection;if((c&&c.saveData)||matchMedia("(prefers-reduced-motion: reduce)").matches){h.setAttribute("data-calm","");return}}catch(e){}h.classList.add("motion")})(document.documentElement)`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>
        {children}
        <RevealObserver />
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
