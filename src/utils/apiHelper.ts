/**
 * Utility to safely fetch and parse JSON responses from the server.
 * Completely eliminates crashes caused by unexpected HTML responses (Vite SPA fallback,
 * Nginx warmup, or Cloud Run 504 Gateway Timeout).
 */
export async function fetchJsonSafely<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  const isHtml =
    !contentType.includes('application/json') ||
    text.trim().startsWith('<') ||
    text.includes('<!doctype') ||
    text.includes('<!DOCTYPE') ||
    text.includes('<html');

  if (isHtml) {
    const trimmed = text.trim();
    if (trimmed.includes('Starting Server...') || trimmed.includes('warmup')) {
      throw new Error(
        'El servidor o el proxy intermediario se está reiniciando. Por favor, reintenta en un momento.'
      );
    }
    if (trimmed.includes('504') || trimmed.includes('Gateway Timeout') || trimmed.includes('Time-out')) {
      throw new Error(
        'Tiempo de espera agotado por el proxy de red (504 Gateway Timeout). Te recomendamos usar el botón "Ejecutar Muestreo Rápido".'
      );
    }
    throw new Error(
      `El servidor devolvió una respuesta HTML inesperada en lugar de datos JSON (código ${response.status}).`
    );
  }

  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Error en la solicitud al servidor (código ${response.status})`
      );
    }
    return data as T;
  } catch (err: any) {
    if (err.message && err.message.startsWith('Error en la solicitud')) {
      throw err;
    }
    throw new Error(
      `Respuesta del servidor no válida (JSON no parseable): ${text.slice(0, 100).replace(/\s+/g, ' ')}...`
    );
  }
}
