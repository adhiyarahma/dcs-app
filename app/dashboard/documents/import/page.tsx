import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ImportClient from './import-client';

export default async function ImportDocumentsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const userId = (session?.user as any)?.id;
  return <ImportClient userId={userId} />;
}
