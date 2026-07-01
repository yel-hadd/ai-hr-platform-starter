import Image from "next/image";
import { cn } from "@/lib/utils";

// Decorative KB collection cover. Stored covers are same-origin object-storage
// proxy paths (/api/kb/images/…) or external https URLs, which next/image serves
// as lazy, optimized AVIF/WebP. Legacy inline data: URLs (which the optimizer
// can't process) fall back to a plain <img>. `alt=""` — covers are decorative.
export function CollectionCover({
  src,
  className,
  sizes = "(max-width: 768px) 100vw, 400px",
}: {
  src: string;
  className?: string;
  sizes?: string;
}) {
  const wrapper = cn("relative overflow-hidden bg-muted", className);

  if (src.startsWith("data:")) {
    return (
      <div className={wrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element -- legacy data: URL; next/image can't optimize these */}
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
    </div>
  );
}
