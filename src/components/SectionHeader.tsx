import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
}

export default function SectionHeader({ title, sub, actions }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
