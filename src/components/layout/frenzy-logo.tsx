import Link from "next/link";
import Image from "next/image";

export function FrenzyLogo() {
  return (
    <Link href="/" aria-label="ANSEM home" className="inline-flex items-center">
      <Image
        src="/logo.png"
        alt="ANSEM"
        width={48}
        height={48}
        sizes="48px"
        quality={100}
        unoptimized
        className="h-12 w-12 object-contain"
        priority
      />
    </Link>
  );
}
