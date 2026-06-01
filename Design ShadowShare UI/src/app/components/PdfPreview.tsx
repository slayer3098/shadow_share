import { useEffect, useRef } from 'react';
import { useState } from 'react';

type Props = {
  src: string | ArrayBuffer | Uint8Array | Blob;
  className?: string;
  style?: React.CSSProperties;
};

export default function PdfPreview({ src, className, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pdf: any = null;

    (async () => {
      try {
        // dynamic import to keep bundle size small and avoid SSR issues
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf');

        let data: Uint8Array | ArrayBuffer;
        if (typeof src === 'string') {
          const res = await fetch(src);
          data = await res.arrayBuffer();
        } else if (src instanceof Blob) {
          data = await src.arrayBuffer();
        } else {
          data = src as ArrayBuffer | Uint8Array;
        }

        if (cancelled) return;

        const loadingTask = pdfjs.getDocument({ data: data as any, disableWorker: true });
        pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport,
        } as any;

        const renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err) {
        console.error('PdfPreview error', err);
        setError('Preview unavailable');
      }
    })();

    return () => {
      cancelled = true;
      try {
        // @ts-ignore
        if (pdf && pdf.destroy) pdf.destroy();
      } catch (e) {}
    };
  }, [src]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {error ? (
        <div className="rounded-md border p-4 text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          {error}
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full rounded-md" />
      )}
    </div>
  );
}
