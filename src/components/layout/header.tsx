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
        "sticky top-0 z-40 mx-2 mt-[max(0.5rem,env(safe-area-inset-top))] flex h-12 items-center gap-1.5 rounded-lg border border-cacao-800/8 bg-background/80 px-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        "sm:mx-4 sm:mt-4 sm:h-14 sm:gap-3 sm:px-3",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-cacao-800/70 lg:hidden dark:text-cream-100/70 sm:size-10"
        onClick={onMenuOpen}
        aria-label="فتح القائمة"
      >
        <Menu className="size-[18px]" aria-hidden />
      </Button>

      {/* Mobile: icon-only search — avoids crowding the action cluster */}
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-cacao-800/70 sm:hidden dark:text-cream-100/70"
        onClick={onSearchOpen}
        aria-label="بحث في النظام"
      >
        <Search className="size-[18px]" aria-hidden />
      </Button>

      {/* Desktop / tablet: full search field */}
      <Button
        variant="outline"
        className="hidden h-10 min-w-0 flex-1 justify-start gap-2 border-cacao-800/10 bg-cream-100/40 text-muted-foreground hover:bg-cream-100/80 sm:inline-flex sm:max-w-sm dark:bg-cacao-800/20"
        onClick={onSearchOpen}
        aria-label="بحث في النظام (Ctrl+K)"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate text-start text-sm">بحث...</span>
        <kbd
          aria-hidden
          className="pointer-events-none ms-auto hidden h-5 select-none items-center gap-1 rounded border border-cacao-800/10 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex"
        >
          <span className="text-xs">Ctrl</span>+K
        </kbd>
      </Button>

      <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <OfflineIndicator />

        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-cacao-800/70 hover:bg-cacao-800/[0.04] dark:text-cream-100/70 sm:size-10"
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
              className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full border-0 bg-berry-500 p-0 text-[9px] text-white sm:size-5 sm:text-[10px]"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          ) : null}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden size-10 text-cacao-800/70 hover:bg-cacao-800/[0.04] dark:text-cream-100/70 sm:inline-flex"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={
            isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"
          }
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
              className="size-9 shrink-0 rounded-full p-0 sm:size-10"
              aria-label="قائمة المستخدم"
            >
              <Avatar className="size-8 border border-cacao-800/10 sm:size-9">
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
              <span className="block truncate text-sm font-medium">
                {userName}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer sm:hidden"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              {isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            </DropdownMenuItem>
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
