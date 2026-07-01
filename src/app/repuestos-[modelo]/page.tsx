import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/site';
import { SITE_NAME } from '@/lib/seo/brand';
import { MOTORCYCLE_MODELS, getMotorcycleModel } from '@/constants/motorcycleModels';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isProductCategory } from '@/constants/productCategories';
import type { Product } from '@/types/product';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ modelo: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { modelo } = await params;
  const model = getMotorcycleModel(modelo);
  
  if (!model) {
    return { title: 'Modelo no encontrado' };
  }

  return {
    title: `Repuestos ${model.name} ${model.brand}`,
    description: model.description,
    keywords: [...model.keywords, 'repuestos', 'motos Colombia'],
    alternates: { canonical: `/repuestos-${model.slug}` },
    openGraph: {
      title: `Repuestos para ${model.name} ${model.brand} | ${SITE_NAME}`,
      description: model.description,
      url: `/repuestos-${model.slug}`,
      type: 'website',
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Repuestos para ${model.name}`,
      description: model.description,
    },
  };
}

async function getModelProducts(modelName: string, limit = 12) {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: modelName, mode: 'insensitive' } },
          { description: { contains: modelName, mode: 'insensitive' } },
          { tags: { has: modelName.toLowerCase() } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
        images: true,
        category: true,
        sizes: true,
        colors: true,
        stock: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return products.map((p): Product => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      currency: (['USD', 'EUR', 'COP'].includes(p.currency) ? p.currency : 'COP') as Product['currency'],
      imageUrl: p.imageUrl ?? p.images?.[0] ?? '',
      images: p.images ?? [],
      category: (isProductCategory(p.category) ? p.category : 'accesorios') as Product['category'],
      sizes: p.sizes,
      colors: p.colors,
      stock: p.stock,
      slug: p.slug ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function MotorcycleModelPage({ params }: PageProps) {
  const { modelo } = await params;
  const model = getMotorcycleModel(modelo);

  if (!model) notFound();

  const products = await getModelProducts(model.name);
  const baseUrl = getBaseUrl();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: model.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const productJsonLd = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Repuestos para ${model.name}`,
    url: `${baseUrl}/repuestos-${model.slug}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/products/${product.slug ?? product.id}`,
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.images?.[0] ?? product.imageUrl,
        description: product.description,
        offers: {
          '@type': 'Offer',
          priceCurrency: product.currency,
          price: product.price,
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      
      <header className="relative overflow-hidden bg-gradient-to-br from-[#050F2C] via-[#0A2A66] to-[#0d3580] py-6 sm:py-8 md:py-12 px-4">
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,_#fff_1px,_transparent_1px)] [background-size:20px_20px]" aria-hidden />
        <div className="relative max-w-7xl mx-auto z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#7BA4D9' }}>
            Repuestos por modelo
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            {model.brand} {model.name}
          </h1>
          <p className="mt-2 text-[#9DC0E8] text-sm max-w-xl">
            {products.length} repuestos disponibles · Envíos a todo Colombia
          </p>
          <p className="mt-3 text-[#C8DCEF] text-sm max-w-2xl leading-relaxed">
            {model.description}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p, idx) => (
              <ProductCard key={p.id} product={p} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No hay repuestos específicos para este modelo aún.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Ver todos los repuestos
            </Link>
          </div>
        )}

        {model.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {model.faqs.map((faq, i) => (
                <details key={i} className="group">
                  <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200 py-3 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="mt-2 text-slate-600 dark:text-slate-400 px-4 pb-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export function generateStaticParams() {
  return MOTORCYCLE_MODELS.map((model) => ({ modelo: model.slug }));
}