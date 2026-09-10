import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function BrandMark() {
  return <Link href="/dashboard" className="flex items-center gap-3 text-lg font-semibold text-white">
    <span className="grid size-10 place-items-center rounded-xl bg-[#8AAE6D] text-[#1F2A1E]"><Leaf aria-hidden="true" className="size-6" /></span>
    <span>Verde Caixa</span>
  </Link>;
}
