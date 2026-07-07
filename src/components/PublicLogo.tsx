import { Link } from "@tanstack/react-router";
import { LOGO_POINTS_URL } from "@/lib/image-urls";
const logoUrl = LOGO_POINTS_URL;

export function PublicLogo({ fixed = false }: { fixed?: boolean }) {
  const wrapperCls = fixed
    ? "fixed top-4 left-4 sm:top-5 sm:left-5 z-50"
    : "block";

  return (
    <Link
      to="/"
      className={`${wrapperCls} hover:opacity-80 transition`}
      aria-label="PointPals home"
    >
      <img
        src={logoUrl}
        alt="PointPals logo"
        width={180}
        height={72}
        className="h-10 w-auto select-none"
        draggable={false}
      />
    </Link>
  );
}
