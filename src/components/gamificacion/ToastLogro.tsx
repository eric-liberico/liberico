import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { GamificacionResultado } from "@/lib/ib";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { LOGROS_EN } from "@/lib/gamificacion-en";

type Props = {
  gamificacion: GamificacionResultado | undefined;
};

function IconoDinamico({ nombre, className }: { nombre: string; className?: string }) {
  const mapa = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icono = mapa[nombre];
  if (!Icono) return <Icons.Award className={className} />;
  return <Icono className={className} />;
}

export function ToastLogro({ gamificacion }: Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";

  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);

  const logros = gamificacion?.logros_nuevos ?? [];

  useEffect(() => {
    if (logros.length > 0) {
      setIndice(0);
      setAbierto(true);
    }
  }, [logros.length]);

  function cerrar() {
    const ids = logros.map((l) => l.logro_id);
    if (ids.length > 0) {
      supabase
        .from("logros_desbloqueados")
        .update({ notificado: true })
        .in("logro_id", ids)
        .then(() => {});
    }
    setAbierto(false);
  }

  function siguiente() {
    if (indice < logros.length - 1) {
      setIndice((i) => i + 1);
    } else {
      cerrar();
    }
  }

  if (logros.length === 0) return null;

  const logro = logros[indice];
  const enTranslation = LOGROS_EN[logro.logro_id];

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!v) cerrar();
      }}
    >
      <DialogContent className="max-w-xs text-center sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-950/40">
            <IconoDinamico
              nombre={logro.icono}
              className="h-10 w-10 text-yellow-600 dark:text-yellow-400"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isEN ? "Achievement unlocked" : "Logro desbloqueado"}
            </p>
            <h3 className="text-lg font-bold">
              {isEN && enTranslation ? enTranslation.nombre : logro.nombre}
            </h3>
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              +{logro.xp_recompensa} XP
            </p>
          </div>
          {gamificacion && (
            <p className="text-xs text-muted-foreground">
              {isEN ? "Total:" : "Total:"} {gamificacion.xp_total.toLocaleString()} XP
              {gamificacion.racha_actual > 1 &&
                (isEN
                  ? ` · ${gamificacion.racha_actual} days in a row`
                  : ` · ${gamificacion.racha_actual} días seguidos`)}
            </p>
          )}
          <Button onClick={siguiente} className="w-full">
            {indice < logros.length - 1
              ? `${isEN ? "Next" : "Siguiente"} (${indice + 1}/${logros.length})`
              : isEN
                ? "Great!"
                : "¡Genial!"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
