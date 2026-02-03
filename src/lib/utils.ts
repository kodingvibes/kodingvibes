import { formatDistanceToNow as formatDistanceToNowBase } from 'date-fns';
import { es } from 'date-fns/locale';

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
