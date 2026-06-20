import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ children, className, style, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-md transition-all duration-300 hover:border-primary/20 hover:shadow-lg",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
