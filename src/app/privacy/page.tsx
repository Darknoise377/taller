import Link from "next/link";
import { ShieldCheckIcon, LockClosedIcon } from "@heroicons/react/24/outline";

const LAST_UPDATED = "19 de enero de 2026";

/**
 * @function PrivacyPage
 * @description Página de Política de Privacidad de TALLER DE MOTOS A&R.
 * Detalla cómo se recopila, usa y protege la información personal de los usuarios.
 */
export default function PrivacyPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <article className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 md:p-8">
        <header className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Compromiso con tu privacidad</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Transparencia sobre qué datos tratamos y para qué.
            </p>
          </div>
        </header>

        <div className="mt-8 space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">1. Información que recopilamos</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Identificación:</strong> nombre, correo, dirección y teléfono.</li>
              <li><strong>Pago:</strong> procesado por terceros (no almacenamos tarjetas).</li>
              <li><strong>Uso:</strong> interacción con páginas, productos vistos y tiempo de permanencia.</li>
              <li><strong>Dispositivo:</strong> IP, navegador, sistema operativo e identificadores.</li>
            </ul>
            <p className="mt-3">
              Algunos datos se generan automáticamente para operar el sitio (por ejemplo, para recordar tu carrito o medir rendimiento).
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">2. Cómo usamos tu información</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Procesar pedidos y pagos.</li>
              <li>Comunicarnos sobre pedidos, productos y promociones.</li>
              <li>Mejorar la experiencia de compra.</li>
              <li>Análisis y optimización del sitio.</li>
              <li>Cumplimiento legal y prevención de fraudes.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">3. Compartir tu información</h3>
            <p>
              No vendemos tu información. Solo la compartimos con proveedores necesarios (pagos, envíos) o por requerimientos legales.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">4. Cookies y tecnologías similares</h3>
            <p>
              Podemos usar cookies para funcionalidades esenciales (por ejemplo, sesión y carrito) y para analítica básica del uso del sitio.
              Puedes administrar cookies desde la configuración de tu navegador.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">5. Seguridad</h3>
            <p>
              Aplicamos medidas de seguridad para proteger la información transmitida. Ningún sistema es infalible, pero trabajamos para minimizar riesgos.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">6. Tus derechos</h3>
            <p>
              Puedes solicitar acceso, corrección o eliminación de tus datos, según aplique. Escríbenos en <Link href="/contact" className="text-[#0A2A66] hover:underline">Contacto</Link>.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">7. Conservación y cambios</h3>
            <p>
              Conservamos la información el tiempo necesario para operar el servicio, cumplir obligaciones legales y gestionar soporte.
              Podemos actualizar esta política cuando sea necesario y publicaremos la versión vigente en esta página.
            </p>
          </section>
        </div>

        <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <LockClosedIcon className="w-4 h-4" />
            Última actualización: {LAST_UPDATED}
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg transition-transform hover:scale-105"
          >
            ¿Preguntas? Contáctanos
          </Link>
        </footer>
      </article>
    </div>
  );
}