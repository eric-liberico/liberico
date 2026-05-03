import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { GamificacionResultado } from "@/lib/ib";

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
    // Marcar todos como notificados
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
              Logro desbloqueado
            </p>
            <h3 className="text-lg font-bold">{logro.nombre}</h3>
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              +{logro.xp_recompensa} XP
            </p>
          </div>
          {gamificacion && (
            <p className="text-xs text-muted-foreground">
              Total: {gamificacion.xp_total.toLocaleString()} XP
              {gamificacion.racha_actual > 1 && ` · ${gamificacion.racha_actual} días seguidos`}
            </p>
          )}
          <Button onClick={siguiente} className="w-full">
            {indice < logros.length - 1 ? `Siguiente (${indice + 1}/${logros.length})` : "¡Genial!"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
