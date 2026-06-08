import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Providers } from '../components/Providers';
import { ThemeToggle } from '../components/ThemeToggle';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Semantic Cost Estimation',
  description: 'Hybrid COCOMO II + LLM effort estimation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers>
          <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
              <Link href="/" className="text-sm font-semibold text-foreground tracking-tight">SCE</Link>
              <Link href="/projects" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Projects</Link>
              <Link href="/evaluation" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Evaluation</Link>
              <Link href="/dataset" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Dataset</Link>
              <ThemeToggle />
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
