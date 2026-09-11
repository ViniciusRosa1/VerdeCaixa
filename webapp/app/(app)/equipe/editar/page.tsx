import { LegacyEditRedirect } from "@/components/legacy-edit-redirect";
export default function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) { return <LegacyEditRedirect base="/equipe" searchParams={searchParams} />; }
