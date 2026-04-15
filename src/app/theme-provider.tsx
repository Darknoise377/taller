"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"     // Usa la clase `dark`
      defaultTheme="system" // Sigue el tema del sistema
      enableSystem={true}   // Permite tema automático
      enableColorScheme={true}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
