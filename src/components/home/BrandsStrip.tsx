'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  image: string;
  model: string;
}

// Marcas populares con imagen referente de una moto icónica
const DEFAULT_BRANDS: Brand[] = [
  { id: '1', name: 'Bajaj', slug: 'bajaj', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/130591/pulsar-ns200-right-front-three-quarter-2.jpeg', model: 'Pulsar NS200' },
  { id: '2', name: 'KTM', slug: 'ktm', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/124865/duke-200-right-front-three-quarter.jpeg', model: 'Duke 200' },
  { id: '3', name: 'Pulsar', slug: 'pulsar', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/130583/pulsar-220f-right-front-three-quarter.jpeg', model: 'Pulsar 220F' },
  { id: '4', name: 'Honda', slug: 'honda', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/44686/cb-190r-right-front-three-quarter.jpeg', model: 'CB 190R' },
  { id: '5', name: 'Yamaha', slug: 'yamaha', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/114423/mt-15-v2-right-front-three-quarter.jpeg', model: 'MT-15' },
  { id: '6', name: 'Suzuki', slug: 'suzuki', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/44228/gixxer-sf-right-front-three-quarter-3.jpeg', model: 'Gixxer SF' },
  { id: '7', name: 'AKT', slug: 'akt', image: 'https://www.auteco.com.co/sites/default/files/2023-06/AKT-CR5-200-Roja.png', model: 'CR5 200' },
  { id: '8', name: 'Auteco', slug: 'auteco', image: 'https://www.auteco.com.co/sites/default/files/2023-06/BAJAJ-DOMINAR-400-Negra.png', model: 'Dominar 400' },
  { id: '9', name: 'TVS', slug: 'tvs', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/106413/apache-rtr-200-4v-right-front-three-quarter.jpeg', model: 'Apache RTR 200' },
  { id: '10', name: 'Hero', slug: 'hero', image: 'https://imgd.aeplcdn.com/1056x594/n/cw/ec/101875/xpulse-200-right-front-three-quarter.jpeg', model: 'XPulse 200' },
];

interface BrandsStripProps {
  brands?: Brand[];
}

export default function BrandsStrip({ brands = DEFAULT_BRANDS }: BrandsStripProps) {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Marcas disponibles
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Repuestos compatibles con las principales marcas del mercado
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
          >
            Ver todos
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Brands grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((brand, idx) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Link
                href={`/products?q=${encodeURIComponent(brand.name)}`}
                className="block group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xl hover:-translate-y-1 hover:border-[#2E5FA7]/40 transition-all duration-300"
              >
                {/* Imagen de moto */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={brand.image}
                    alt={`${brand.name} ${brand.model}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    unoptimized
                  />
                  {/* Overlay gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Nombre de marca sobre la imagen */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-extrabold text-base drop-shadow-lg">
                      {brand.name}
                    </p>
                    <p className="text-white/70 text-[11px] font-medium drop-shadow">
                      {brand.model}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
