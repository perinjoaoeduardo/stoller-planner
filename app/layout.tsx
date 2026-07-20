import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/app/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

// Manrope é a única fonte "de texto" do sistema — mesma variável pra
// --font-sans e --font-heading (a fonte velha JetBrains Mono saiu do
// sistema em jul/2026).
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Corteva Planner",
  description: "Planejamento e execução comercial Corteva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        manrope.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
