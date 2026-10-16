import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'FixMyBharat | AI-Powered Civic Intelligence Platform',
  description:
    'Turn everyday civic problems into actionable solutions. Report civic issues, track real-time resolution timelines, and empower municipal departments with AI-assisted triage.',
  keywords: [
    'Civic Tech',
    'FixMyBharat',
    'Municipal Governance',
    'Pothole Reporting',
    'Open Manhole Alert',
    'Smart City Bharat',
    'Team SyncMates',
  ],
  authors: [{ name: 'Team SyncMates' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
