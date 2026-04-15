import Link from "next/link";
import Image from "next/image";
import {
  SparklesIcon,
  HeartIcon,
  RocketLaunchIcon,
  FlagIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

/**
 * @function AboutPage
 * @description Página "Sobre Nosotros".
 * Presenta la misión, visión, valores y el compromiso con una experiencia de compra clara.
 */
export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Intro */}
      <section className="rounded-2xl bg-gradient-to-b from-white/60 to-white/30 dark:from-[#071022]/60 dark:to-[#081022]/30 border border-slate-200 dark:border-slate-800 p-8 shadow-xl backdrop-blur-md">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
          Quiénes somos y cómo comprar
        </h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          En <strong className="text-slate-900 dark:text-slate-100">TALLER DE MOTOS A&amp;R</strong>, construimos una tienda enfocada en repuestos y accesorios para moto.
          Queremos que encuentres lo que necesitas sin vueltas: información clara, stock visible y una compra simple.
        </p>
        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Nuestro objetivo es simple: ayudarte a mantener tu moto lista, con productos confiables y una experiencia de compra accesible.
        </p>

        <div className="mt-6 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-lg font-semibold mb-3">Cómo comprar (en 4 pasos)</h3>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2"><span className="font-semibold">1.</span>Explora productos y entra al detalle.</li>
            <li className="flex gap-2"><span className="font-semibold">2.</span>Revisa stock y (si aplica) talla/color.</li>
            <li className="flex gap-2"><span className="font-semibold">3.</span>Añade al carrito y confirma cantidades.</li>
            <li className="flex gap-2"><span className="font-semibold">4.</span>Finaliza el checkout y recibe tu pedido.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Recomendación: valida compatibilidad con tu moto (modelo/año) antes de comprar.
          </p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg transition-transform hover:scale-105"
          >
            Explorar productos
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md transition-shadow"
          >
            Contacto
          </Link>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Nuestra Misión</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Ofrecer repuestos y accesorios para moto con información clara, compra sencilla y un servicio que te acompañe antes y después del pedido.
          </p>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
              <RocketLaunchIcon className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Nuestra Visión</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Ser una referencia en repuestos y accesorios para moto, destacando por una experiencia moderna, accesible y transparente.
          </p>
        </div>
      </section>

      {/* Calidad Colombiana */}
      <section className="mt-10 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
                <FlagIcon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold">Calidad colombiana</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Apostamos por procesos responsables y proveedores confiables.
              Nuestro compromiso es ofrecer productos consistentes y una experiencia clara desde el catálogo hasta la entrega.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Image
              src="/images/colombia-flag.png"
              alt="Bandera de Colombia"
              width={60}
              height={40}
              className="rounded-md shadow-lg"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Hecho con pasión en Colombia
            </span>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-2xl font-bold">Nuestros valores</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Principios que guían cada decisión
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: HeartIcon,
              title: "Autenticidad",
              description: "Hablamos claro: información simple y sin letras pequeñas.",
            },
            {
              icon: SparklesIcon,
              title: "Innovación",
              description: "Mejoramos el catálogo y la experiencia para que compres rápido.",
            },
            {
              icon: RocketLaunchIcon,
              title: "Calidad",
              description: "Priorizamos productos confiables y consistentes.",
            },
            {
              icon: FlagIcon,
              title: "Compromiso local",
              description: "Construimos con enfoque local y soporte cercano.",
            },
            {
              icon: HeartIcon,
              title: "Servicio",
              description: "Atención clara y oportuna antes, durante y después de tu compra.",
            },
            {
              icon: SparklesIcon,
              title: "Transparencia",
              description: "Información simple en procesos, precios y políticas.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">{title}</h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}