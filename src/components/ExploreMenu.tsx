import { Link } from "@tanstack/react-router";
import { Heart, Menu, Settings, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const shortcuts = [
  { to: "/favoritos", label: "Favoritos", Icon: Heart },
  { to: "/doar", label: "Doar", Icon: Sparkles },
  { to: "/ajustes", label: "Ajustes", Icon: Settings },
] as const;

export function ExploreMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Abrir menu">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
        {shortcuts.map(({ to, label, Icon }) => (
          <DropdownMenuItem key={to} asChild className="rounded-lg px-3 py-2.5">
            <Link to={to}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}