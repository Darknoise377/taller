// src/app/products/[id]/ProductDetailClient.tsx

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  ShareIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getProductCategoryLabel } from '@/constants/productCategories';
import { Facebook, Instagram } from 'lucide-react';

// --- Prop Interfaces ---
interface ProductDetailClientProps {
  product: Product;
  relatedProducts?: Product[];
}

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

// --- Sub-componentes para Mejor Organización ---

/**
 * 🎨 Galería de Imágenes Avanzada
 */
const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  const nextImage = useCallback(() => setCurrentIndex((prev) => (prev + 1) % images.length), [images.length]);
  const prevImage = useCallback(() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length), [images.length]);
  
  const handleNavigate = (newDirection: number) => {
    if (newDirection > 0) {
      nextImage();
    } else {
      prevImage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (images.length <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevImage();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextImage();
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
      {/* Thumbnails Verticales (Desktop) */}
      <div className="hidden md:flex flex-col gap-3">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "relative w-20 h-20 rounded-lg overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#070617] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]",
              currentIndex === idx ? "ring-[#0A2A66]" : "ring-transparent hover:ring-[#0A2A66]/60"
            )}
            aria-label={`Ver imagen ${idx + 1} de ${productName}`}
            aria-current={currentIndex === idx}
          >
            <Image
              src={img}
              alt={`Miniatura de ${productName} - vista ${idx + 1}`}
              fill
              loading="lazy"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Imagen Principal con Zoom al hover */}
      <figure
        className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 shadow-lg backdrop-blur-md cursor-zoom-in"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setZoomPos({ x, y });
        }}
        aria-label={`Galería de imágenes de ${productName}. Usa flechas izquierda y derecha.`}
      >
        <Image
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Imagen de ${productName} - vista ${currentIndex + 1}`}
          fill
          priority
          className={cn(
            "object-cover transition-transform duration-200",
            isZooming && "scale-[2]"
          )}
          style={isZooming ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <figcaption className="sr-only">Vista {currentIndex + 1} de {images.length}</figcaption>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => handleNavigate(-1)}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-[#070617]/70 backdrop-blur-sm p-2 rounded-full text-slate-900 dark:text-slate-100 hover:bg-white/90 dark:hover:bg-[#070617]/90 transition shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate(1)}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 dark:bg-[#070617]/70 backdrop-blur-sm p-2 rounded-full text-slate-900 dark:text-slate-100 hover:bg-white/90 dark:hover:bg-[#070617]/90 transition shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}
      </figure>

      {/* Thumbnails Horizontales (Móvil) */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#070617] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]",
              currentIndex === idx ? "ring-[#0A2A66]" : "ring-transparent"
            )}
            aria-label={`Ver imagen ${idx + 1} de ${productName}`}
            aria-current={currentIndex === idx}
          >
            <Image
              src={img}
              alt={`Miniatura de ${productName} - vista ${idx + 1}`}
              fill
              loading="lazy"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * ✨ Componente Principal de la Página
 */
const ProductDetailClient: React.FC<ProductDetailClientProps> = ({ product, relatedProducts = [] }) => {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<Product["sizes"][number] | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [validationMessage, setValidationMessage] = useState<string>("");

  const images = useMemo(() => 
    product.images && product.images.length > 0 ? product.images : [product.imageUrl || "/placeholder.png"],
    [product.images, product.imageUrl]
  );
  
  const handleAddToCart = () => {
    if (product.stock <= 0) {
      setValidationMessage("Este producto está agotado.");
      return;
    }
    if (product.sizes.length > 0 && !selectedSize) {
      setValidationMessage("Selecciona una medida/referencia antes de anadir al carrito.");
      return;
    }
    if (product.colors.length > 0 && !selectedColor) {
      setValidationMessage("Selecciona una compatibilidad antes de anadir al carrito.");
      return;
    }

    setValidationMessage("");
    addToCart(product, quantity, selectedSize, selectedColor);
  };

  const lowStockThreshold = 5;

  useEffect(() => {
    setValidationMessage("");
  }, [selectedSize, selectedColor, quantity]);

  const descriptionText =
    product.description?.trim() ||
    "Repuesto para moto de alta calidad. Revisa compatibilidad por marca, modelo y medida antes de comprar.";

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#070617] dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <nav aria-label="Miga de pan" className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/"
                className="hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded"
              >
                Inicio
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li>
              <Link
                href="/products"
                className="hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded"
              >
                Productos
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li className="text-slate-700 dark:text-slate-200 line-clamp-1" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <article className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <ImageGallery images={images} productName={product.name} />

          <div className="glass p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
            <header>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {product.name}
              </h1>

              {/* Star Rating (visual display) */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center" aria-label="Calificación: 4.5 de 5 estrellas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    star <= 4 ? (
                      <StarIconSolid key={star} className="w-5 h-5 text-amber-400" />
                    ) : (
                      <StarIcon key={star} className="w-5 h-5 text-amber-400/40" />
                    )
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">4.5 / 5</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">(Reseñas próximamente)</span>
              </div>

              {/* Detalles técnicos rápidos (SKU, categoría, etiquetas, diagrama) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <div className="text-xs text-slate-500">SKU</div>
                  <div className="font-medium mt-1">{product.sku ?? String(product.id)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Categoría</div>
                  <div className="font-medium mt-1">{getProductCategoryLabel(product.category)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Etiquetas</div>
                  <div className="mt-1">{product.tags && product.tags.length > 0 ? product.tags.join(', ') : <span className="text-slate-400">Sin etiquetas</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Número en Diagrama</div>
                  <div className="font-medium mt-1">{product.diagramNumber ?? <span className="text-slate-400">—</span>}</div>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
                {descriptionText}
              </p>
            </header>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-3xl font-bold text-[#0A2A66] dark:text-[#2E5FA7]">
                {product.currency} {Number(product.price).toLocaleString("es-CO")}
              </div>

              <div className="flex items-center gap-2" id="stock-status">
                {product.stock > 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full",
                      product.stock <= lowStockThreshold
                        ? "text-yellow-900 bg-yellow-100"
                        : "text-green-900 bg-green-100"
                    )}
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {product.stock <= lowStockThreshold
                      ? `¡Últimas ${product.stock}!`
                      : "Disponible"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-900 bg-red-100 px-3 py-1 rounded-full">
                    <XCircleIcon className="w-5 h-5" />
                    Agotado
                  </span>
                )}
              </div>
            </div>

            {validationMessage && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm"
              >
                {validationMessage}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200/80 dark:border-slate-800/80 pt-6 space-y-6">
              {product.sizes.length > 0 && (
                <section aria-label="Opciones de medida">
                  <h2 className="text-base font-semibold">
                    Medida / referencia:{" "}
                    <span className="font-normal text-slate-600 dark:text-slate-300">
                      {selectedSize ?? "Sin seleccionar"}
                    </span>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        
                        className={cn(
                          "px-4 h-10 min-w-[44px] flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]",
                          selectedSize === s
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                            : "bg-transparent border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {product.colors.length > 0 && (
                <section aria-label="Opciones de compatibilidad">
                  <h2 className="text-base font-semibold">
                    Compatibilidad:{" "}
                    <span className="font-normal text-slate-600 dark:text-slate-300 capitalize">
                      {selectedColor ?? "Sin seleccionar"}
                    </span>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.colors.map((compatibility) => (
                      <button
                        key={compatibility}
                        type="button"
                        onClick={() => setSelectedColor(compatibility)}
                        aria-label={`Seleccionar compatibilidad ${compatibility}`}
                        
                        className={cn(
                          "px-3 h-10 rounded-lg text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]",
                          selectedColor === compatibility
                            ? "bg-[#2E5FA7] text-white border-[#2E5FA7]"
                            : "bg-transparent border-slate-300 dark:border-slate-700 hover:border-[#2E5FA7]"
                        )}
                      >
                        {compatibility}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section aria-label="Cantidad y compra" className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-white/60 dark:bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Disminuir cantidad"
                      className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
                      disabled={quantity <= 1}
                    >
                      <MinusIcon className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-semibold w-10 text-center" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      aria-label="Aumentar cantidad"
                      className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
                      disabled={quantity >= product.stock}
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-sm text-slate-500 dark:text-slate-400" aria-hidden="true">
                    Máx: {product.stock}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={handleAddToCart}
                  aria-describedby="stock-status"
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]"
                >
                  <ShoppingCartIcon className="w-6 h-6" />
                  <span>{product.stock > 0 ? "Añadir al carrito" : "Agotado"}</span>
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tip: confirma compatibilidad con tu moto (modelo/año) antes de comprar.
                </p>

                {/* Share buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Compartir:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator.share({
                          title: product.name,
                          text: `Mira este producto: ${product.name}`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Enlace copiado al portapapeles");
                      }
                    }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label="Compartir producto"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Mira este producto: ${product.name} - ` + (typeof window !== "undefined" ? window.location.href : ""))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    aria-label="Compartir por WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                  {/* Follow links */}
                  <div className="ml-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Síguenos:</span>
                    <a
                      href="https://www.facebook.com/ROBINSON.BOTERO.M/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a
                      href="https://www.instagram.com/motoservicioayr/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a
                      href="https://www.tiktok.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="TikTok"
                    >
                      TikTok
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </article>
        
        {/* Productos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 sm:mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">También te podría interesar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((item) => (
                <div key={item.id} className="bg-white/70 dark:bg-slate-900/40 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1">
                  <Link href={`/products/${item.id}`} aria-label={`Ver detalles de ${item.name}`}>
                    <div className="relative w-full aspect-square">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={`Imagen de ${item.name}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <span className="text-[#0A2A66] dark:text-[#2E5FA7] font-bold mt-1 block">
                        {item.currency} {Number(item.price).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetailClient;