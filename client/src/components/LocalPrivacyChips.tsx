import { useEffect, useState } from "react";
import { Cpu, LockKeyhole, Sparkles } from "lucide-react";
import { detectLocalRuntime, type LocalRuntimeStatus } from "@/lib/localRuntime";

export function LocalPrivacyChips() {
  const [runtime, setRuntime] = useState<LocalRuntimeStatus | null>(null);
  useEffect(() => { void detectLocalRuntime().then(setRuntime); }, []);

  const chipClass = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Status da IA local">
      <span className={`${chipClass} border-violet-400/30 bg-violet-500/10 text-violet-200`}><Sparkles className="h-3 w-3" /> IA local</span>
      <span className={`${chipClass} border-cyan-400/30 bg-cyan-500/10 text-cyan-200`}><Cpu className="h-3 w-3" /> {runtime?.webgpuAvailable ? "GPU disponível" : runtime?.wasmAvailable ? "WASM disponível" : "Regras locais"}</span>
      <span className={`${chipClass} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`}><LockKeyhole className="h-3 w-3" /> Dados protegidos</span>
    </div>
  );
}
