import { AppShell } from "@/components/app-shell";
import { PrototypeRouter } from "@/components/prototype-router";

const primaryRoutes = [
  ["login"],
  ["criar-conta"],
  ["dashboard"],
  ["agenda"],
  ["receber"],
  ["receber", "novo"],
  ["receber", "editar"],
  ["pagar"],
  ["pagar", "novo"],
  ["pagar", "editar"],
  ["clientes"],
  ["clientes", "novo"],
  ["clientes", "editar"],
  ["fornecedores"],
  ["fornecedores", "novo"],
  ["fornecedores", "editar"],
  ["categorias"],
  ["categorias", "nova"],
  ["categorias", "editar"],
  ["contas-financeiras"],
  ["contas-financeiras", "nova"],
  ["contas-financeiras", "editar"],
  ["projetos"],
  ["projetos", "novo"],
  ["projetos", "editar"],
  ["relatorios"],
  ["relatorios", "dre"],
  ["relatorios", "dfc"],
  ["relatorios", "posicao-financeira"],
  ["relatorios", "kpis"],
  ["equipe"],
  ["equipe", "novo"],
  ["equipe", "editar"],
  ["perfis"],
  ["perfis", "novo"],
  ["perfis", "editar"],
  ["notificacoes"],
  ["historico"],
  ["configuracoes"],
];

export const dynamicParams = false;

export function generateStaticParams() {
  return primaryRoutes.map((path) => ({ path }));
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  if (path[0] === "login" || path[0] === "criar-conta")
    return <PrototypeRouter path={path} />;
  return (
    <AppShell path={path}>
      <PrototypeRouter path={path} />
    </AppShell>
  );
}
