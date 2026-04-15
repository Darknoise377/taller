import Link from "next/link";
import { DocumentTextIcon, ScaleIcon } from "@heroicons/react/24/outline";

const LAST_UPDATED = "19 de enero de 2026";

/**
 * @function TermsPage
 * @description Página de Términos y Condiciones de TALLER DE MOTOS A&R.
 * Proporciona información legal sobre el uso de la tienda online.
 */
export default function TermsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <article className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 md:p-8">
        <header className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Términos y condiciones</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Reglas de uso del sitio y condiciones generales de compra.
            </p>
          </div>
        </header>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Este documento es informativo y no constituye asesoría legal.
        </p>

        <div className="mt-8 space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">1. Uso del sitio web</h3>
            <p>
              El contenido de este sitio es para tu información y uso general. Puede cambiar sin previo aviso. No garantizamos exactitud o idoneidad para un propósito particular.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">2. Cuenta, datos y comunicaciones</h3>
            <p>
              Al realizar una compra puedes requerir entregar información de contacto y envío. Te comprometes a que la información sea veraz y esté actualizada.
              Podemos comunicarnos contigo para gestionar pedidos, soporte y notificaciones relacionadas.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">3. Propiedad intelectual</h3>
            <p>
              El material del sitio (diseño, textos, gráficos e imágenes) es de nuestra propiedad o licenciado. No se permite la reproducción total o parcial salvo autorización.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">4. Precios, disponibilidad y pagos</h3>
            <p>
              Los precios están en COP e incluyen IVA salvo indicación. La disponibilidad puede variar.
              Los métodos de pago se muestran durante el proceso de compra. En caso de inconsistencias, podremos contactarte para validar o cancelar el pedido.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">5. Envíos, cambios y devoluciones</h3>
            <p>
              Los tiempos de entrega son estimados y pueden depender de la transportadora y la ubicación.
              Las condiciones de cambios y devoluciones se describen en las secciones correspondientes del sitio o en las comunicaciones del pedido.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">6. Privacidad</h3>
            <p>
              Nuestra <Link href="/privacy" className="text-[#0A2A66] hover:underline">Política de Privacidad</Link> describe cómo recopilamos y protegemos tu información.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">7. Limitación de responsabilidad</h3>
            <p>
              El uso del sitio es bajo tu responsabilidad. En la medida permitida por la ley, no asumimos responsabilidad por daños indirectos derivados del uso o imposibilidad de uso del sitio.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">8. Cambios y vigencia</h3>
            <p>
              Podemos actualizar estos términos en cualquier momento. La versión vigente se publicará en esta página.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">9. Ley aplicable</h3>
            <p>
              El uso del sitio se rige por las leyes de Colombia.
            </p>
          </section>
        </div>

        <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ScaleIcon className="w-4 h-4" />
            Última actualización: {LAST_UPDATED}
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg transition-transform hover:scale-105"
          >
            ¿Tienes preguntas? Contáctanos
          </Link>
        </footer>
      </article>
    </div>
  );
}
