import { CategoriasForm } from "@/components/domains/categorias/categorias-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CategoriasForm id={(await params).id} />; }
