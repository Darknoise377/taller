import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rateLimit";

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes for allowed image formats
const MAGIC_BYTES: [string, number[]][] = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]], // RIFF
  ["image/gif", [0x47, 0x49, 0x46]],
];

function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const entry = MAGIC_BYTES.find(([type]) => type === declaredType);
  if (!entry) return false;
  const [, expected] = entry;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  return true;
}

export async function POST(req: Request) {
  try {
    // Rate limit: 30 uploads per 5 minutes
    const limit = rateLimit(req, { keyPrefix: 'upload', windowMs: 5 * 60 * 1000, max: 30 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Intenta más tarde." },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF)." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo de 5 MB." },
        { status: 400 }
      );
    }

    // Convertir el archivo en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes (prevent spoofed MIME types)
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con el tipo declarado." },
        { status: 400 }
      );
    }

    // Subir a Cloudinary usando tu upload preset
    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          upload_preset: "onelike", // 👈 tu preset de Cloudinary
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            const maybe = result as unknown;
            if (
              maybe &&
              typeof maybe === "object" &&
              "secure_url" in maybe &&
              "public_id" in maybe
            ) {
              const r = maybe as { secure_url: unknown; public_id: unknown };
              if (typeof r.secure_url === "string" && typeof r.public_id === "string") {
                resolve({ secure_url: r.secure_url, public_id: r.public_id });
                return;
              }
            }
            reject(new Error("Respuesta inválida de Cloudinary"));
          }
        }
      );
      uploadStream.end(buffer);
    });

    // ✅ Devuelve secure_url como espera el frontend
    return NextResponse.json({
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error subiendo imagen:", error);
    return NextResponse.json({ error: "Error al subir imagen: " + message }, { status: 500 });
  }
}

