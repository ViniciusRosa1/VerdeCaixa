import { ContasFinanceirasForm } from "@/components/domains/contas-financeiras/contas-financeiras-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ContasFinanceirasForm id={(await params).id} />; }
