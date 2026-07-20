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
  { id: '1', name: 'Bajaj', slug: 'bajaj', image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&h=300&fit=crop', model: 'Pulsar NS200' },
  { id: '2', name: 'KTM', slug: 'ktm', image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=300&fit=crop', model: 'Duke 200' },
  { id: '3', name: 'Pulsar', slug: 'pulsar', image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400&h=300&fit=crop', model: 'Pulsar 220F' },
  { id: '4', name: 'Honda', slug: 'honda', image: 'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=400&h=300&fit=crop', model: 'CB 190R' },
  { id: '5', name: 'Yamaha', slug: 'yamaha', image: 'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=400&h=300&fit=crop', model: 'MT-15' },
  { id: '6', name: 'Suzuki', slug: 'suzuki', image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop', model: 'Gixxer SF' },
  { id: '7', name: 'AKT', slug: 'akt', image: 'https://images.unsplash.com/photo-1622185135505-2d795003994a?w=400&h=300&fit=crop', model: 'CR5 200' },
  { id: '8', name: 'Auteco', slug: 'auteco', image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=400&h=300&fit=crop', model: 'Dominar 400' },
  { id: '9', name: 'TVS', slug: 'tvs', image: 'https://images.unsplash.com/photo-1615172282427-9a57ef2d142e?w=400&h=300&fit=crop', model: 'Apache RTR 200' },
  { id: '10', name: 'Hero', slug: 'hero', image: 'https://images.unsplash.com/photo-1508357941501-0924cf312bbd?w=400&h=300&fit=crop', model: 'XPulse 200' },
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
