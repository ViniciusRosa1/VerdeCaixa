import { EquipeForm } from "@/components/domains/equipe/equipe-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <EquipeForm id={(await params).id} />; }
