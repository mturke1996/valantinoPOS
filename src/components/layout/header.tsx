"use client";

import { useTheme } from "next-themes";
import { Bell, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OfflineIndicator } from "@/components/shared/offline-indicator";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  onSearchOpen?: () => void;
  onMenuOpen?: () => void;
  notificationCount?: number;
  userName?: string;
  userAvatarUrl?: string;
  className?: string;
}

export function Header({
  onSearchOpen,
  onMenuOpen,
  notificationCount = 0,
  userName = "مستخدم",
  userAvatarUrl,
  className,
}: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onSearchOpen?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchOpen]);

  const isDark = mounted && (resolvedTheme ?? theme) === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 mx-3 mt-[max(0.75rem,env(safe-area-inset-top))] flex h-14 items-center justify-between gap-3 rounded-lg border border-cacao-800/8 bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:mx-4 sm:mt-4 sm:gap-4 sm:px-4",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-cacao-800/70 lg:hidden dark:text-cream-100/70"
        onClick={onMenuOpen}
        aria-label="فتح القائمة"
      >
        <Menu className="size-[18px]" aria-hidden />
      </Button>

      <Button
        variant="outline"
        className="h-11 w-full max-w-sm justify-start gap-2 border-cacao-800/10 bg-cream-100/40 text-muted-foreground hover:bg-cream-100/80 dark:bg-cacao-800/20"
        onClick={onSearchOpen}
        aria-label="بحث في النظام (Ctrl+K)"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-start text-sm">بحث...</span>
        <kbd
          aria-hidden
          className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-cacao-800/10 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex"
        >
          <span className="text-xs">Ctrl</span>+K
        </kbd>
      </Button>

      <div className="flex items-center gap-1">
        <OfflineIndicator />
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11 text-cacao-800/70 hover:bg-cacao-800/[0.04] dark:text-cream-100/70"
          aria-label={
            notificationCount > 0
              ? `الإشعارات، ${notificationCount} غير مقروء`
              : "الإشعارات"
          }
          onClick={() => router.push("/notifications")}
        >
          <Bell className="size-[18px]" aria-hidden />
          {notificationCount > 0 ? (
            <Badge
              aria-hidden
              className="absolute -top-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full border-0 bg-berry-500 p-0 text-[10px] text-white"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          ) : null}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-cacao-800/70 hover:bg-cacao-800/[0.04] dark:text-cream-100/70"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
        >
          {mounted ? (
            isDark ? (
              <Sun className="size-[18px]" aria-hidden />
            ) : (
              <Moon className="size-[18px]" aria-hidden />
            )
          ) : (
            <Moon className="size-[18px]" aria-hidden />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full p-0"
              aria-label="قائمة المستخدم"
            >
              <Avatar className="size-9 border border-cacao-800/10">
                {userAvatarUrl ? (
                  <AvatarImage src={userAvatarUrl} alt={userName} />
                ) : null}
                <AvatarFallback className="bg-cacao-800/8 text-cacao-800 dark:bg-cacao-800/40 dark:text-cream-50">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{userName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-berry-600 focus:text-berry-600 dark:text-berry-400"
            >
              <LogOut className="size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
