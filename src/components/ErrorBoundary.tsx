"use client";

import React from "react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Algo salió mal
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
            Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold text-sm shadow"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="px-5 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
