import type { Metadata } from "next";
import { Roboto, Audiowide } from "next/font/google";
import "./globals.css";
import { InstagramIcon } from "lucide-react";
import ToastRoot from "@/components/ToastRoot";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const audiowide = Audiowide({
  variable: "--font-audiowide",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "DJ Gokai — Electronic Vibes",
  description:
    "High-energy electronic DJ sets. Book now for clubs, festivals, and private events.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "DJ Gokai — Electronic Vibes",
    description:
      "High-energy electronic DJ sets. Book now for clubs, festivals, and private events.",
    type: "website",
    url: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${audiowide.variable} antialiased`} suppressHydrationWarning>
        <ToastRoot>
          <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-white/10">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <img src="/logo-symbol.png" alt="DJ Gokai" className="h-16 w-16 object-contain" />
              </a>
              <div className="hidden md:flex items-center gap-6 text-sm text-white/80">
                <nav className="flex items-center gap-6">
                  <a href="#sets" className="hover:text-white">Sets</a>
                  <a href="#about" className="hover:text-white">Sobre</a>
                  <a href="#contact" className="pill px-4 py-2 hover:bg-white/10">Contratar</a>
                </nav>
              </div>
            </div>
          </header>
          {children}
        </ToastRoot>
        <footer className="mt-24 border-t border-white/10">
          <div className="container mx-auto px-6 py-10 text-sm text-white/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <span> {new Date().getFullYear()} DJ Gokai. Todos os direitos reservados.</span>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/djgokai" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-white flex items-center">
                <InstagramIcon size={18} />
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
