"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, Trophy, Info, User } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Lotteries", href: "/lotteries", icon: Trophy },
    { name: "My Tickets", href: "/tickets", icon: Ticket },
    { name: "Winners", href: "/winners", icon: Info },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <aside className="w-56 flex-shrink-0 hidden lg:flex flex-col gap-4 h-[calc(100vh-2rem)] sticky top-10">
      <nav className="flex flex-col gap-1.5 neu-raised rounded-2xl p-4 flex-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-2">
          Navigation
        </h3>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "neu-inset"
                  : "hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${
                  isActive
                    ? "accent-bg text-white"
                    : "neu-flat text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="neu-flat rounded-2xl p-4">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          <span>Network</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full led-success"></div>
            Mainnet
          </div>
        </div>
      </div>
    </aside>
  );
}
