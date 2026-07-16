import { formatDistanceToNow as formatDistanceToNowBase } from 'date-fns';
import { es } from 'date-fns/locale';
import imageCompression from 'browser-image-compression';

export function formatDistanceToNow(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatDistanceToNowBase(dateObj, { 
      addSuffix: true,
      locale: es 
    });
  } catch {
    // Fallback simple si date-fns no está disponible
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  }
}

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Comprime una imagen para reducir su tamaño antes de subirla al bucket
 * @param file - Archivo de imagen a comprimir
 * @param options - Opciones de compresión
 * @returns Archivo comprimido
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 1, // Máximo 1MB
    maxWidthOrHeight: 1280, // Máximo 1280px de ancho o alto (suficiente para móvil 3G)
    useWebWorker: true,
    fileType: 'image/webp', // Convertir a WebP para mejor compresión
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    // Si el archivo comprimido es WebP, actualizar el nombre
    const extension = compressionOptions.fileType === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    
    return new File([compressedFile], `${nameWithoutExt}.${extension}`, {
      type: compressionOptions.fileType as string,
    });
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    // Si falla la compresión, devolver el archivo original
    return file;
  }
}
