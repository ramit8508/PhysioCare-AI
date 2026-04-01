"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { LocaleProvider, useLocaleContext } from "@/lib/locale-context";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";

function AppProviders({ children }: { children: React.ReactNode }) {
  const { locale } = useLocaleContext();
  const messages = locale === "hi" ? hiMessages : enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryClientProvider client={queryClientRef()}>
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}

let client: QueryClient | null = null;
function queryClientRef() {
  if (!client) {
    client = new QueryClient();
  }
  return client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppProviders>{children}</AppProviders>
    </LocaleProvider>
  );
}
