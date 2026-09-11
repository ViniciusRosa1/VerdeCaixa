import { ClientesForm } from "@/components/domains/clientes/clientes-form";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ClientesForm id={(await params).id} />;
}
