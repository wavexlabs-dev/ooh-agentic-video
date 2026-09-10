/**
 * Utilidades para captura y extracción de fotogramas de video en el cliente (Browser).
 * Permite muestrear un video subido (MP4, WEBM, MOV) en múltiples fotogramas con sus
 * respectivos timestamps para enviarlos a Gemini 3.8 Flash con visión multimodal.
 */

export interface ExtractedFrame {
  timeSec: number;
  base64: string;
}

/**
 * Captura el fotograma actual reproducido en un elemento <video>.
 */
export function captureCurrentFrame(video: HTMLVideoElement): ExtractedFrame {
  const canvas = document.createElement('canvas');
  const maxDim = 1280;
  let w = video.videoWidth || 1280;
  let h = video.videoHeight || 720;

  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = Math.max(w, 320);
  canvas.height = Math.max(h, 180);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.warn('Could not draw video frame to canvas:', e);
    }
  }

  return {
    timeSec: Number((video.currentTime || 0).toFixed(1)),
    base64: canvas.toDataURL('image/jpeg', 0.82),
  };
}

/**
 * Muestrea N fotogramas a lo largo de la duración de un video en memoria.
 */
export async function extractSampleFrames(
  videoSrc: string,
  targetCount: number = 6,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedFrame[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const frames: ExtractedFrame[] = [];

    const timeout = setTimeout(() => {
      console.warn('Frame extraction timed out, returning captured frames');
      resolve(frames);
    }, 25000);

    video.onloadedmetadata = async () => {
      try {
        const actualDuration = video.duration && !isNaN(video.duration) ? video.duration : 60;
        const count = Math.min(Math.max(targetCount, 1), 10);
        const timestamps: number[] = [];

        if (actualDuration <= 5) {
          timestamps.push(Number((actualDuration / 2).toFixed(1)));
        } else {
          // Reparte uniformemente a lo largo del recorrido
          const start = Math.min(1.0, actualDuration * 0.05);
          const end = Math.max(actualDuration - 1.0, actualDuration * 0.95);
          const step = (end - start) / (count + 1);
          for (let i = 1; i <= count; i++) {
            timestamps.push(Number((start + i * step).toFixed(1)));
          }
        }

        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          onProgress?.(i + 1, timestamps.length);

          await new Promise<void>((seekDone) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              try {
                const captured = captureCurrentFrame(video);
                frames.push({ timeSec: t, base64: captured.base64 });
              } catch (err) {
                console.error('Error drawing frame at', t, err);
              }
              seekDone();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = t;
          });
        }

        clearTimeout(timeout);
        resolve(frames);
      } catch (err) {
        console.error('Error in sample frame extraction:', err);
        clearTimeout(timeout);
        resolve(frames);
      }
    };

    video.onerror = (e) => {
      console.error('Video error during extraction:', e);
      clearTimeout(timeout);
      resolve([]);
    };
  });
}
