import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Atlas — Sistema de Rotina de Estudos Adaptativo',
  description: 'Cronograma automático que se ajusta sozinho quando você não cumpre o planejado.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
