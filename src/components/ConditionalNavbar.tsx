"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname() ?? "";

  // Ocultar el Navbar en cualquier ruta bajo /admin
  if (pathname.startsWith("/admin")) return null;

  // Añadir más reglas aquí si quieres ocultarlo en otras páginas (checkout, etc.)
  return <Navbar />;
}
