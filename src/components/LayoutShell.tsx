"use client";

import { usePathname } from "next/navigation";
import { WalletProvider } from "@/context/WalletContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // On the /present route, render children without the sidebar/navbar chrome
  if (pathname === "/present") {
    return <>{children}</>;
  }

  return (
    <WalletProvider>
      <div className="flex h-full w-full overflow-hidden p-4 md:p-8 gap-4 md:gap-8 max-w-[1600px] mx-auto">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
          <Navbar />
          {children}
        </main>
      </div>
    </WalletProvider>
  );
}
