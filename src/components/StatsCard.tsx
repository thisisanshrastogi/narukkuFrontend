import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  subtext?: string;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
}: StatsCardProps) {
  return (
    <div className="neu-flat rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:border-[rgba(255,255,255,0.09)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl neu-inset-shallow flex items-center justify-center text-[var(--accent-primary)]">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {label}
          </span>
          {subtext && (
            <span className="text-[10px] text-[var(--text-secondary)] truncate">
              {subtext}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 min-w-0">
        <span className="text-lg font-semibold text-[var(--text-primary)] font-mono tracking-tight truncate">
          {value}
        </span>
        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] opacity-60 shrink-0"></span>
      </div>
    </div>
  );
}
