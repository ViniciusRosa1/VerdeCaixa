import { AppShell } from '@/components/app-shell';
import { PrototypeRouter } from '@/components/prototype-router';

export default function HomePage() {
  const path: string[] = [];
  return <AppShell path={path}><PrototypeRouter path={path} /></AppShell>;
}
