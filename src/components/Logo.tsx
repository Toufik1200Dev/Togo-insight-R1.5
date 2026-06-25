"use client";

import { useState } from "react";

/**
 * App logo. Renders the real /logo.png (in /public) and only falls back to the
 * on-brand /logo.svg placeholder if the PNG is missing — so the actual logo
 * shows everywhere, with no placeholder-icon flash.
 */
export default function Logo({
  height = 52,
  className,
  alt = "Togo Insight",
}: {
  height?: number;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState("/logo.png");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ height, width: "auto" }}
      onError={() => {
        if (src !== "/logo.svg") setSrc("/logo.svg");
      }}
    />
  );
}
