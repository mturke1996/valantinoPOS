"use client";

import { Toaster } from "sonner";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaRegister } from "@/components/shared/pwa-register";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <PwaRegister />
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          toastOptions={{
            classNames: {
              toast:
                "border border-cacao-800/10 bg-background text-foreground shadow-none",
              title: "font-medium",
              description: "text-muted-foreground",
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
