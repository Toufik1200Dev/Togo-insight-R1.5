/**
 * App logo — the Togo Insight circular 5G emblem (public/logo.svg, vector so it
 * stays crisp at any size). Used in the navbar, dashboard sidebar, login & signup.
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt={alt} className={className} style={{ height, width: "auto" }} />
  );
}
