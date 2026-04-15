import { EnvelopeIcon, PhoneIcon, MapPinIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
// ELIMINADO: import Link from 'next/link'; // Ya no es necesario si no se usa en el componente

/**
 * @function ContactPage
 * @description Página de contacto para TALLER DE MOTOS A&R.
 * Proporciona información de contacto y un formulario de ejemplo.
 */
export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
          <EnvelopeIcon className="w-10 h-10 text-[#0A2A66] mb-3" />
          <h3 className="text-xl font-semibold mb-2">Correo electrónico</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-3">
            Para soporte general, pedidos y solicitudes.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Tiempo estimado de respuesta: 1–2 días hábiles.
          </p>
          <a
            href="mailto:info@onelikeoficial.com"
            className="text-sm font-semibold text-[#0A2A66] hover:underline"
          >
            info@onelikeoficial.com
          </a>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
          <PhoneIcon className="w-10 h-10 text-[#2E5FA7] mb-3" />
          <h3 className="text-xl font-semibold mb-2">Teléfono / WhatsApp</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-3">
            Para consultas rápidas y seguimiento de pedidos.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Horario sugerido: lunes a viernes, 9:00–18:00.
          </p>
          <a
            href="tel:+573101234567"
            className="text-sm font-semibold text-[#0A2A66] hover:underline"
          >
            +57 310 123 4567
          </a>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
          <MapPinIcon className="w-10 h-10 text-[#0A2A66] mb-3" />
          <h3 className="text-xl font-semibold mb-2">Ubicación</h3>
          <p className="text-slate-600 dark:text-slate-300">
            Calle 123 # 45 - 67, Bogotá, Colombia
          </p>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 md:col-span-2 lg:col-span-3">
          <div className="flex items-start gap-4">
            <ChatBubbleLeftRightIcon className="w-10 h-10 text-[#2E5FA7]" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Envíanos un mensaje</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Completa el formulario con la mayor información posible (número de pedido, producto, talla, etc.).
              </p>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66]"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Correo
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66]"
                    placeholder="tu@ejemplo.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Asunto
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66]"
                    placeholder="¿En qué te ayudamos?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66]"
                    placeholder="Escribe tu mensaje aquí..."
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-end w-full">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Al enviar, aceptas nuestra <a className="text-[#0A2A66] hover:underline" href="/privacy">Política de Privacidad</a>.
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg transition-transform hover:scale-105"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}