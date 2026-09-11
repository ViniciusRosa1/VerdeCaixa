import { ReceberForm } from "@/components/domains/receber/receber-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ReceberForm id={(await params).id} />; }
