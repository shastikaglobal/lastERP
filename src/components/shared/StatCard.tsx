import { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="erp-card erp-card-hover p-5 relative overflow-hidden group">
      {/* Decorative background glow on hover */}
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
      
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary-glow group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            {icon}
          </div>
        )}
      </div>
      <div className="relative z-10 mt-3 text-2xl font-bold tracking-tight text-foreground drop-shadow-sm">{value}</div>
      <div className="relative z-10 mt-1.5 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              delta.positive ? "text-success" : "text-destructive"
            )}
          >
            {delta.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
