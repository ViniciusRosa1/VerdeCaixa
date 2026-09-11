import { ProjetosForm } from "@/components/domains/projetos/projetos-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ProjetosForm id={(await params).id} />; }
