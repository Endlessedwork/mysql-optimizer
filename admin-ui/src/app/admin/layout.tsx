import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers';
import { AdminLayout } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'MySQL Optimizer Admin Panel',
};

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AdminLayout>{children}</AdminLayout>
    </QueryProvider>
  );
}