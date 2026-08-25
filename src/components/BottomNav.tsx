import { Link } from "@tanstack/react-router";
import { MapPin, Heart, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Perto de mim", Icon: MapPin },
  { to: "/favoritos", label: "Favoritos", Icon: Heart },
  { to: "/ajustes", label: "Ajustes", Icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-6 w-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
