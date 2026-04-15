import { Suspense } from "react";
import ResponseClient from "./response-client";

export default function PaymentResponsePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#070617] dark:to-[#0b0a1f]">
          <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-2xl p-8 md:p-12 max-w-lg w-full border border-gray-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-slate-200 border-t-slate-500 animate-spin" />
            <p className="text-lg text-slate-600 dark:text-slate-300">Cargando respuesta...</p>
          </div>
        </main>
      }
    >
      <ResponseClient />
    </Suspense>
  );
}
