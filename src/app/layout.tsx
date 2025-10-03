import type { Metadata } from "next";
import { Prompt, Sarabun, Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import PerformanceTracker from "@/components/PerformanceTracker";
import { AuthProvider } from "@/contexts/AuthContext";

// Optimized Thai font loading with preload and fallbacks
const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"], // Thai first for better loading priority
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"], // Thai first for better loading priority
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
});

// Modern Thai font (Inter for Latin, system fonts for Thai)
const inter = Inter({
  variable: "--font-sukhumvit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Pranara AI - Your Wellbeing Companion",
  description: "AI-powered wellbeing companion providing personalized mental health support, mindfulness guidance, and therapeutic conversations in Thai and English",
  keywords: "wellbeing, mental health, AI companion, mindfulness, therapy, stress relief, emotional support, Pranara",
  authors: [{ name: "Pranara" }],
  robots: "index, follow",
  openGraph: {
    title: "Pranara AI - Your Wellbeing Companion",
    description: "AI-powered wellbeing companion providing personalized mental health support, mindfulness guidance, and therapeutic conversations",
    type: "website",
    locale: "th_TH",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on input focus
  interactiveWidget: 'resizes-content' as const, // Better Android keyboard handling
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" dir="ltr">
      <head>
        {/* Safari Mobile Meta Tags - Fix green background bleeding */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />

        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        


        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />

        {/* Optimize font loading with font-display: swap */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Font loading optimization */
            @font-face {
              font-family: 'Prompt-fallback';
              src: local('system-ui'), local('-apple-system'), local('BlinkMacSystemFont');
              font-display: swap;
              unicode-range: U+0E00-0E7F; /* Thai Unicode range */
            }
            

            
            /* Reduce layout shift during font loading */
            .font-prompt {
              font-family: var(--font-prompt), 'Prompt-fallback', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .font-sarabun {
              font-family: var(--font-sarabun), 'Prompt-fallback', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .font-space-mono {
              font-family: var(--font-space-mono), 'Courier New', monospace;
            }
            
            .font-sukhumvit {
              font-family: var(--font-sukhumvit), 'SF Pro Display', 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            }
            
            .font-ibm-plex-thai {
              font-family: 'IBM Plex Sans Thai', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            }
            

            
            /* Mobile performance optimizations */
            * {
              -webkit-tap-highlight-color: transparent;
              -webkit-touch-callout: none;
            }
            
            /* Prevent iOS zoom on input focus - keep font size 16px+ */
            input,
            textarea,
            select {
              font-size: 16px !important;
            }
            
            /* Touch-friendly interactions */
            .touch-active {
              transform: scale(0.98);
              opacity: 0.8;
            }
            
            /* Smooth scrolling for supported browsers */
            @media (prefers-reduced-motion: no-preference) {
              html {
                scroll-behavior: smooth;
              }
            }
            
            /* Custom scrollbar for chat */
            .chat-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
            }
            
            .chat-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            
            .chat-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .chat-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.5);
              border-radius: 3px;
            }
            
            .chat-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: rgba(156, 163, 175, 0.7);
            }
            
            /* Optimize text rendering */
            .chat-message-content {
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            /* Reduce motion for users who prefer it */
            @media (prefers-reduced-motion: reduce) {
              *,
              *::before,
              *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
              }
            }
            
            /* iOS Safe Area Support - Prevent background bleeding */
            @supports (padding: max(0px)) {
              .safe-area-top {
                padding-top: max(env(safe-area-inset-top), 0px);
              }
              
              .safe-area-bottom {
                padding-bottom: max(env(safe-area-inset-bottom), 0px);
              }
            }
            
            /* Prevent background color bleeding on iOS Safari */
            html {
              background-color: #ffffff;
            }
            
            body {
              background-color: #ffffff;
            }
            
            /* High contrast mode support */
            @media (prefers-contrast: high) {
              .bg-blue-600 {
                background-color: #000080 !important;
              }
              
              .text-gray-400 {
                color: #666666 !important;
              }
              
              .border-gray-200 {
                border-color: #333333 !important;
              }
            }
          `
        }} />
      </head>
      <body
        className={`${prompt.variable} ${sarabun.variable} ${spaceMono.variable} ${inter.variable} font-prompt antialiased bg-white text-gray-900`}
      >
        <AuthProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AuthProvider>
        <PerformanceTracker />
      </body>
    </html>
  );
}
