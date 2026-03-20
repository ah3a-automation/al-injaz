import { useEffect, useMemo, useState } from 'react';
import { X, FileText, Image as ImageIcon, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/Components/ui/button';

interface DocumentPreviewModalProps {
    open: boolean;
    onClose: () => void;
    label: string;
    fileName?: string | null;
    mimeType?: string | null;
    previewUrl?: string | null;
}

export function DocumentPreviewModal({
    open,
    onClose,
    label,
    fileName,
    mimeType,
    previewUrl,
}: DocumentPreviewModalProps) {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        setRotation(0);
    }, [open, previewUrl]);

    if (!open) return null;

    const effectiveFileName = fileName ?? label;
    const lower = (effectiveFileName ?? '').toLowerCase();
    const isImage =
        (mimeType && mimeType.startsWith('image/')) ||
        ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lower.endsWith(ext));
    const isPdf =
        mimeType === 'application/pdf' ||
        lower.endsWith('.pdf');
    const canRotate = !!previewUrl && (isImage || isPdf);
    const isQuarterTurn = Math.abs(rotation % 180) === 90;
    const rotatedMediaStyle = useMemo(
        () => ({
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center' as const,
            transition: 'transform 200ms ease',
        }),
        [rotation]
    );
    const rotatedImageClass = isQuarterTurn
        ? 'max-h-none w-[72vh] max-w-none object-contain'
        : 'max-h-[75vh] max-w-full object-contain';
    const rotatedPdfStyle = {
        ...rotatedMediaStyle,
        width: isQuarterTurn ? '72vh' : '100%',
        height: isQuarterTurn ? 'min(72vw, 80vh)' : '75vh',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                            {label}
                        </p>
                        {effectiveFileName && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {effectiveFileName}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {canRotate && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setRotation((value) => value - 90)}
                                    aria-label="Rotate left"
                                    title="Rotate left"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setRotation((value) => value + 90)}
                                    aria-label="Rotate right"
                                    title="Rotate right"
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm text-muted-foreground hover:bg-muted"
                            aria-label="Close preview"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex max-h-[80vh] min-h-[60vh] items-center justify-center overflow-auto bg-muted/40 px-4 py-4">
                    {previewUrl && isImage && (
                        <div className="flex items-center justify-center p-2">
                            <img
                                src={previewUrl}
                                alt={effectiveFileName}
                                className={rotatedImageClass}
                                style={rotatedMediaStyle}
                                loading="lazy"
                            />
                        </div>
                    )}
                    {previewUrl && isPdf && (
                        <div className="flex w-full items-center justify-center overflow-auto p-2">
                            <iframe
                                src={previewUrl}
                                title={effectiveFileName}
                                className="border-0 bg-white shadow-sm"
                                style={rotatedPdfStyle}
                            />
                        </div>
                    )}
                    {(!previewUrl || (!isImage && !isPdf)) && (
                        <div className="flex flex-col items-center justify-center text-center">
                            {isPdf ? (
                                <FileText className="h-10 w-10 text-red-500 dark:text-red-400" />
                            ) : (
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                            <p className="mt-2 text-xs font-medium text-foreground">
                                {effectiveFileName || label}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
