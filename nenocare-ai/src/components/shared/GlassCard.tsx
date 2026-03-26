import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className, hover = false }: GlassCardProps) => (
  <div className={cn(
    "glass",
    hover && "transition-all duration-200 hover:bg-slate-900/70 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_40px_rgba(0,0,0,0.4)]",
    className
  )}>
    {children}
  </div>
);
