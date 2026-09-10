import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useInstallPrompt } from "@/lib/install";

const DISMISS_KEY = "godhelp-install-dismissed";

/** Convite discreto para instalar o app na tela inicial. */
export function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!canInstall || dismissed) return null;

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-30 px-4">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-urban/10 text-urban">
          <Download className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Instale o GodHelp na tela inicial para acesso rápido, mesmo offline.
        </p>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="shrink-0 rounded-full bg-urban px-3 py-2 text-xs font-bold text-urban-foreground"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Dispensar convite de instalação"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
