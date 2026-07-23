/**
 * Pipeline ÚNICO de fotos do app (bucket activity-photos).
 *
 * Antes desta consolidação havia 4 cópias de compressImage (com
 * qualidade divergente 0.8 vs 0.82), limites de 5MB e 10MB para o MESMO
 * bucket e 5 templates de URL pública espalhados. Toda regra de foto
 * vive aqui; telas importam daqui.
 */

export const PHOTO_BUCKET = "activity-photos";

/** Limite de upload ANTES da compressão (unificado; era 5MB em 2 telas). */
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** URL pública de uma foto no bucket (bucket é público por policy). */
export function publicPhotoUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`;
}

/**
 * Caminho único no bucket: `<prefixo>/<timestamp>-<sufixo>.<ext>`.
 * Prefixos em uso: "execucoes", "notes/<channelId>", "<activityId>".
 */
export function photoStoragePath(prefix: string, extension: string): string {
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

/** Reduz a imagem no client (máx. 1600px, JPEG q0.8) antes do upload. */
export async function compressImage(file: File): Promise<Blob> {
  if (file.size < 400 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.8);
  });
}
