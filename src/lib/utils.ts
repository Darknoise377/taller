// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de forma inteligente y condicional.
 * @param {...ClassValue[]} inputs - Clases a combinar.
 * @returns {string} - Una cadena de clases sin conflictos.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza URL de video de Cloudinary para reproducir en HTML5 video.
 * Añade .mp4 si no está presente en URLs de video.
 */
export function normalizeVideoUrl(url: string): string {
  if (!url) return url;
  if (url.includes('.mp4')) return url;
  if (url.includes('cloudinary.com') && url.includes('/video/upload')) {
    return url.concat('.mp4');
  }
  return url;
}