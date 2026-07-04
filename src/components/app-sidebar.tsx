"use client";

import { Radar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center rounded-md px-4 py-2 text-sm transition-colors ${
        isActive ? "bg-zinc-800 text-cyan-400" : "text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-cyan-400" />
      )}
      {children}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 flex h-full w-[240px] flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2 p-6">
        <Radar size={24} className="text-zinc-50" />
        <span className="text-sm font-semibold text-zinc-50">
          ProductPulse
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-4">
        <NavLink href="/" isActive={pathname === "/"}>
          Feed
        </NavLink>
        <NavLink href="/competitors" isActive={pathname === "/competitors"}>
          Competitors
        </NavLink>
      </nav>
    </div>
  );
}
