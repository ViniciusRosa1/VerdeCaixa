import { redirect } from "next/navigation";
export async function LegacyEditRedirect({
  base,
  searchParams,
}: {
  base: string;
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return redirect(id ? `${base}/${encodeURIComponent(id)}/editar` : base);
}
