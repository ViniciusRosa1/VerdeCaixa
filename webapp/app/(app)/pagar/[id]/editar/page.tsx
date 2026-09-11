import { PagarForm } from "@/components/domains/pagar/pagar-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <PagarForm id={(await params).id} />; }
