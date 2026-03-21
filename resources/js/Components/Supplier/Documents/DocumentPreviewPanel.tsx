import { FileText, Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

interface DocumentPreviewPanelProps {
    label: string;
    fileName?: string | null;
    mimeType?: string | null;
    previewUrl?: string | null;
    emptyText: string;
    onClick?: () => void;
}

export function DocumentPreviewPanel({
    label,
    fileName,
    mimeType,
    previewUrl,
    emptyText,
    onClick,
}: DocumentPreviewPanelProps) {
    const debugPreview =
        import.meta.env.DEV ||
        (typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('previewdebug') === '1');
    const isInteractive = typeof onClick === 'function';
    const baseClass = `flex h-[132px] w-full overflow-hidden rounded-lg border border-border/60 bg-card text-xs transition focus:outline-none focus:ring-2 focus:ring-ring ${
        isInteractive ? 'cursor-pointer hover:bg-muted' : 'cursor-default'
    }`;
    const [pdfThumbnailUrl, setPdfThumbnailUrl] = useState<string | null>(null);
    const [pdfThumbnailState, setPdfThumbnailState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    const isImage = useMemo(() => {
        if (!previewUrl && !mimeType && !fileName) return false;
        if (mimeType?.startsWith('image/')) return true;
        const lower = fileName?.toLowerCase() ?? '';
        return ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lower.endsWith(ext));
    }, [mimeType, fileName, previewUrl]);

    const isPdf = useMemo(() => {
        if (!previewUrl && !mimeType && !fileName) return false;
        if (mimeType === 'application/pdf') return true;
        const lower = fileName?.toLowerCase() ?? '';
        return lower.endsWith('.pdf');
    }, [mimeType, fileName, previewUrl]);

    useEffect(() => {
        if (!debugPreview) return;
        // Avoid logging huge values; keep to ids/flags.
        // eslint-disable-next-line no-console
        console.debug('[DocumentPreviewPanel]', {
            label,
            fileName: fileName ?? null,
            mimeType: mimeType ?? null,
            previewUrl: previewUrl ?? null,
            isPdf,
            isImage,
        });
    }, [debugPreview, label, fileName, mimeType, previewUrl, isPdf, isImage]);

    useEffect(() => {
        let cancelled = false;
        let currentObjectUrl: string | null = null;

        const clearThumbnail = () => {
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
                currentObjectUrl = null;
            }
        };

        if (!isPdf || !previewUrl) {
            setPdfThumbnailUrl(null);
            setPdfThumbnailState('idle');
            return () => clearThumbnail();
        }

        setPdfThumbnailState('loading');
        setPdfThumbnailUrl(null);

        void (async () => {
            try {
                const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
                pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

                const response = await fetch(previewUrl, { credentials: 'include' });
                const contentType = response.headers.get('content-type');
                if (!response.ok) {
                    // eslint-disable-next-line no-console
                    console.warn('[DocumentPreviewPanel] PDF thumbnail fetch failed', {
                        previewUrl,
                        status: response.status,
                        contentType,
                    });
                    throw new Error(`Failed to load PDF preview: ${response.status}`);
                }

                // eslint-disable-next-line no-console
                console.debug('[DocumentPreviewPanel] PDF thumbnail fetch ok', {
                    previewUrl,
                    status: response.status,
                    contentType,
                });

                const pdfData = await response.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: pdfData });
                const pdfDocument = await loadingTask.promise;
                const page = await pdfDocument.getPage(1);
                const initialViewport = page.getViewport({ scale: 1 });
                const scale = Math.min(1.5, 168 / initialViewport.width, 116 / initialViewport.height);
                const viewport = page.getViewport({ scale });
                const canvas = globalThis.document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) {
                    throw new Error('Canvas context unavailable');
                }

                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);

                await page.render({
                    canvasContext: context,
                    viewport,
                }).promise;

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((value) => resolve(value), 'image/png');
                });

                page.cleanup();
                pdfDocument.cleanup();
                pdfDocument.destroy();

                if (!blob) {
                    throw new Error('Canvas export failed');
                }

                if (cancelled) {
                    return;
                }

                currentObjectUrl = URL.createObjectURL(blob);
                setPdfThumbnailUrl(currentObjectUrl);
                setPdfThumbnailState('ready');
            } catch {
                // eslint-disable-next-line no-console
                console.warn('[DocumentPreviewPanel] PDF thumbnail render failed', {
                    previewUrl,
                });
                if (cancelled) {
                    return;
                }

                setPdfThumbnailState('error');
                setPdfThumbnailUrl(null);
            }
        })();

        return () => {
            cancelled = true;
            clearThumbnail();
        };
    }, [isPdf, previewUrl]);

    if (!previewUrl && !fileName) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={!isInteractive}
                className={`${baseClass} flex-col items-center justify-center border-dashed px-3 py-3 text-center`}
            >
                <p className="font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 max-w-[15ch] text-[11px] leading-4 text-muted-foreground">
                    {emptyText}
                </p>
            </button>
        );
    }

    if (isImage) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={!isInteractive}
                className={`${baseClass} items-center justify-center px-2 py-2 text-start`}
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={fileName ?? label}
                        className="h-full w-full object-contain"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center px-3 py-4 text-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 max-w-full break-all text-xs font-medium text-foreground">
                            {fileName}
                        </p>
                    </div>
                )}
            </button>
        );
    }

    if (isPdf) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={!isInteractive}
                className={`${baseClass} flex-col items-center justify-center px-3 py-3 text-center`}
            >
                {pdfThumbnailUrl ? (
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-muted/30">
                        <img
                            src={pdfThumbnailUrl}
                            alt={fileName ?? label}
                            className="h-full w-full object-contain"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <>
                        <FileText className="h-7 w-7 text-red-500 dark:text-red-400" />
                        <p className="mt-2 w-full truncate px-2 text-xs font-medium text-foreground">
                            {fileName}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                            {pdfThumbnailState === 'loading' ? 'Loading preview' : 'PDF'}
                        </p>
                    </>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!isInteractive}
            className={`${baseClass} flex-col items-center justify-center px-3 py-3 text-center`}
        >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 w-full truncate px-2 text-xs font-medium text-foreground">
                {fileName ?? label}
            </p>
        </button>
    );
}
