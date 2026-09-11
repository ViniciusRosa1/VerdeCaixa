import { FornecedoresForm } from "@/components/domains/fornecedores/fornecedores-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <FornecedoresForm id={(await params).id} />; }
