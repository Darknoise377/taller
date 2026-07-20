'use client';

import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const benefits = [
  {
    icon: <CheckCircleIcon className="w-6 h-6" />,
    title: 'Stock real',
    description: '+5000 referencias siempre disponibles en nuestro taller',
  },
  {
    icon: <ShieldCheckIcon className="w-6 h-6" />,
    title: 'Garantía incluida',
    description: 'En cada pieza que vendemos, original o genérica de calidad',
  },
  {
    icon: <TruckIcon className="w-6 h-6" />,
    title: 'Envío rápido',
    description: 'Despacho el mismo día hábil a toda Colombia',
  },
];

export default function CompactBenefits() {
  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            ¿Por qué comprar con nosotros?
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Compromiso con la calidad y el servicio
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-14 h-14 mb-4 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] dark:from-[#2E5FA7] dark:to-[#5B9BD5] flex items-center justify-center text-white shadow-lg">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
