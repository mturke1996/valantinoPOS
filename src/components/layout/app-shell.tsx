"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import type { UserRole } from "@/config/navigation";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
  fullscreen?: boolean;
  notificationCount?: number;
  userName?: string;
  userAvatarUrl?: string;
  className?: string;
}

export function AppShell({
  children,
  userRole = "admin",
  fullscreen = false,
  notificationCount = 0,
  userName,
  userAvatarUrl,
  className,
}: AppShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  useOfflineSync();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (fullscreen) {
    return (
      <div className={cn("flex h-svh flex-col bg-background", className)}>
        <main className="flex-1 overflow-hidden">{children}</main>
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          userRole={userRole}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex h-svh bg-background", className)}>
      <Sidebar
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        className="hidden lg:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onSearchOpen={() => setCommandOpen(true)}
          onMenuOpen={() => setMobileMenuOpen(true)}
          notificationCount={notificationCount}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
        />

        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        userRole={userRole}
      />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="p-0 lg:hidden">
          <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
          <Sidebar
            userRole={userRole}
            collapsed={false}
            onClose={() => setMobileMenuOpen(false)}
            className="w-full border-s-0"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
