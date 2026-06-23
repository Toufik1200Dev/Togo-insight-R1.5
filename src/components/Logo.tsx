"use client";

import { useEffect, useState } from "react";

/**
 * App logo. Renders the on-brand placeholder /logo.svg immediately (so it's
 * always visible, even on statically prerendered pages), then upgrades to your
 * real /logo.png if you've dropped one into /public. No broken-image flashes.
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
  const [src, setSrc] = useState("/logo.svg");

  useEffect(() => {
    // If a real logo.png exists, switch to it once it has loaded successfully.
    const probe = new window.Image();
    probe.onload = () => setSrc("/logo.png");
    probe.src = "/logo.png";
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={{ height, width: "auto" }} />
  );
}
