import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/components/app-providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://verde-caixa.windy-wave-7147.chatgpt.site'),
  title: { default: 'Verde Caixa', template: '%s | Verde Caixa' },
  description: 'Controle financeiro simples para pequenas empresas.',
  applicationName: 'Verde Caixa',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Verde Caixa',
    description: 'Finanças claras para pequenas empresas.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verde Caixa',
    description: 'Finanças claras para pequenas empresas.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#1F2A1E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
