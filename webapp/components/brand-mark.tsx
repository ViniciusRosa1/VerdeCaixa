import Image from "next/image";
import Link from 'next/link';

export function BrandMark() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 text-lg font-semibold text-white"
      aria-label="Verde Caixa — ir para a visão geral"
    >
      <Image
        src="/verde-caixa-icon.png"
        alt=""
        width={361}
        height={395}
        priority
        className="h-14 w-[51px] shrink-0 object-contain"
      />
      <span>Verde Caixa</span>
    </Link>
  );
}
