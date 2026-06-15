import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMTA | Adaptive Multilingual Travel Assistant",
  description: "Breaking language barriers across Telugu travel dialects with AI-powered normalisation and translation.",
  keywords: "Telugu, Tamil, translation, dialect, travel, India, Telangana, Rayalaseema, Uttarandhra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-text-main antialiased selection:bg-accent selection:text-white">
        
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border-custom px-4 sm:px-8 py-4 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Logo and Branding */}
            <div className="flex items-center gap-3">
              <div className="text-3xl flex items-center justify-center bg-card p-2.5 rounded-custom border border-border-custom shadow-sm">
                🌍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-outfit font-extrabold text-2xl tracking-tight text-primary">AMTA</span>
                  <span className="px-2 py-0.5 bg-accent/20 text-primary text-[10px] uppercase tracking-widest font-extrabold rounded-full border border-accent/20">v1.0</span>
                </div>
                <h1 className="text-text-muted text-xs font-medium tracking-wide">
                  Adaptive Multilingual Travel Assistant
                </h1>
              </div>
            </div>

            {/* Slogan (Hidden on Mobile) */}
            <div className="hidden lg:block text-center text-text-muted text-[13px] italic font-medium">
              "Breaking language barriers across Telugu travel dialects."
            </div>

            {/* Navigation links */}
            <nav className="flex items-center gap-2 font-inter font-medium text-[14px]">
              <Link 
                href="/" 
                className="px-3.5 py-2 text-text-main rounded-custom hover:bg-card smooth-hover transition-all"
                id="nav-home"
              >
                Home
              </Link>
              <Link 
                href="/analytics" 
                className="px-3.5 py-2 text-text-main rounded-custom hover:bg-card smooth-hover transition-all"
                id="nav-analytics"
              >
                Analytics
              </Link>
              <Link 
                href="/adaptive-data" 
                className="px-3.5 py-2 text-text-main rounded-custom hover:bg-card smooth-hover transition-all"
                id="nav-adaptive-data"
              >
                Adaptive Data Track
              </Link>
              <Link 
                href="/feedback" 
                className="px-3.5 py-2 text-text-main rounded-custom hover:bg-card smooth-hover transition-all"
                id="nav-feedback"
              >
                Feedback Logs
              </Link>
            </nav>

          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border-custom py-6 px-8 text-center text-text-muted text-xs font-medium">
          <p>© {new Date().getFullYear()} AMTA. Made for multilingual travelers in India.</p>
        </footer>

      </body>
    </html>
  );
}
