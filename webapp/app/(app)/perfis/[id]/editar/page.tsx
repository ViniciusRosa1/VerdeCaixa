import { PerfisForm } from "@/components/domains/perfis/perfis-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <PerfisForm id={(await params).id} />; }
