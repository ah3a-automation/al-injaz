import { useCallback, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { useLocale } from '@/hooks/useLocale';

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/jpg,image/webp';

const matchesAccept = (file: File, acceptAttr: string): boolean => {
    const acceptedTypes = acceptAttr
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    if (acceptedTypes.length === 0) {
        return true;
    }

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    return acceptedTypes.some((acceptedType) => {
        if (acceptedType === '*/*') {
            return true;
        }

        if (acceptedType.startsWith('.')) {
            return fileName.endsWith(acceptedType);
        }

        if (acceptedType.endsWith('/*')) {
            return fileType.startsWith(acceptedType.slice(0, -1));
        }

        return fileType === acceptedType;
    });
};

export interface SupplierImageUploadFieldProps {
    /** Optional accept attribute for file input (e.g. include PDF for document uploads). */
    accept?: string;
    /** Unique id for the file input (and label htmlFor). */
    id: string;
    /** Field label shown above (e.g. "Avatar"). */
    label?: string;
    /** Helper/spec text (formats, max size). */
    helperText?: string;
    /** Current preview image URL (existing or blob). */
    previewUrl: string | null;
    /** Inline validation error. */
    error?: string | null;
    /** Button label when no file (e.g. "Upload avatar"). */
    uploadButtonLabel: string;
    /** Button label when file exists (e.g. "Replace avatar"). */
    replaceButtonLabel: string;
    /** Ref for the hidden file input (parent may clear it). */
    inputRef: React.RefObject<HTMLInputElement>;
    /** Called when user selects a file (click or drop). Parent typically opens crop modal. */
    onFileSelect: (file: File | null) => void;
    /** Whether a file is currently set (controls Replace vs Upload button). */
    hasFile: boolean;
    /** Preview shape: circle for avatar, rounded for logo/cards, rectangle for business cards. */
    previewShape: 'circle' | 'rounded' | 'rectangle';
    /** Alt text for preview image. */
    alt: string;
    /** Optional visual density mode. Default is comfortable; 'compact' is for tight layouts like modals. */
    size?: 'default' | 'compact';
    /** Whether to show the inline preview surface. Turn off for compact document upload controls. */
    showPreview?: boolean;
}

export function SupplierImageUploadField({
    id,
    label,
    helperText,
    previewUrl,
    error,
    uploadButtonLabel,
    replaceButtonLabel,
    inputRef,
    onFileSelect,
    hasFile,
    previewShape,
    alt,
    accept,
    size = 'default',
    showPreview = true,
}: SupplierImageUploadFieldProps) {
    const acceptAttr = accept ?? ACCEPT_IMAGE;
    const { t } = useLocale();
    const [isDragging, setIsDragging] = useState(false);

    const isCompact = size === 'compact';

    const previewClass =
        previewShape === 'circle'
            ? isCompact
                ? 'rounded-full aspect-square w-16 h-16'
                : 'rounded-full aspect-square w-24 h-24'
            : previewShape === 'rectangle'
              ? isCompact
                  ? 'rounded-lg aspect-[1.75/1] w-full max-w-[170px]'
                  : 'rounded-lg aspect-[1.75/1] w-full max-w-[210px]'
              : isCompact
                  ? 'rounded-lg aspect-square w-16 h-16'
                  : 'rounded-lg aspect-square w-24 h-24';
    const shapeClass = previewShape === 'circle' ? 'rounded-full' : 'rounded-lg';

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0] ?? null;
            onFileSelect(file);
            e.target.value = '';
        },
        [onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (!file || !matchesAccept(file, acceptAttr)) return;
            onFileSelect(file);
            if (inputRef.current) inputRef.current.value = '';
        },
        [acceptAttr, onFileSelect, inputRef]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleZoneClick = useCallback(() => {
        inputRef.current?.click();
    }, [inputRef]);

    const isPdf = (url: string | null): boolean =>
        url === '__pdf__' || (url?.toLowerCase?.().endsWith('.pdf') === true);

    const showInlinePreview = showPreview && hasFile && !!previewUrl;
    const compactSurfaceClass =
        showPreview || !isCompact
            ? `min-w-16 ${previewClass}`
            : 'min-h-[72px] w-full rounded-lg px-3 py-2.5';
    const compactDropzoneStateClass = isDragging
        ? 'border-primary bg-muted/50'
        : !showPreview && hasFile
          ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
          : 'border-muted-foreground/30';
    const uploadZoneText =
        !showPreview && hasFile ? replaceButtonLabel : t('upload_click_or_drag', 'supplier_portal');

    return (
        <div className={isCompact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
            {label != null && label !== '' && (
                <Label
                    htmlFor={id}
                    className={isCompact ? 'text-[11px] font-medium' : 'text-sm font-medium'}
                >
                    {label}
                </Label>
            )}
            {helperText != null && helperText !== '' && (
                <p className={isCompact ? 'text-[11px] text-muted-foreground' : 'text-xs text-muted-foreground'}>
                    {helperText}
                </p>
            )}
            <div className={isCompact ? 'flex flex-col items-start gap-1.5' : 'flex flex-col items-start gap-2'}>
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={acceptAttr}
                    className="hidden"
                    onChange={handleInputChange}
                    aria-label={label ?? alt}
                />
                {showInlinePreview ? (
                    isPdf(previewUrl) ? (
                        <div
                            className={`flex flex-col items-center justify-center overflow-hidden border-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 ${compactSurfaceClass}`}
                        >
                            <FileText
                                className={isCompact ? 'h-6 w-6 shrink-0 mb-0.5 text-red-500 dark:text-red-400' : 'h-8 w-8 shrink-0 text-red-500 dark:text-red-400 mb-1'}
                            />
                            <span className={isCompact ? 'text-[10px] font-medium text-red-600 dark:text-red-400' : 'text-xs font-medium text-red-600 dark:text-red-400'}>
                                PDF
                            </span>
                        </div>
                    ) : (
                        <div
                            className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/30 ${compactSurfaceClass}`}
                        >
                            <img
                                src={previewUrl}
                                alt={alt}
                                className={`w-full h-full object-cover ${shapeClass}`}
                            />
                        </div>
                    )
                ) : (
                    <div
                        className={`flex shrink-0 flex-col items-center justify-center ${
                            isCompact ? 'gap-0.5' : 'gap-1'
                        } border border-dashed bg-muted/30 transition-colors ${compactSurfaceClass} ${
                            compactDropzoneStateClass
                        } cursor-pointer hover:bg-muted/50`}
                        onClick={handleZoneClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleZoneClick();
                            }
                        }}
                    >
                        <Upload
                            className={isCompact ? 'h-7 w-7 shrink-0 text-muted-foreground' : 'h-10 w-10 shrink-0 text-muted-foreground'}
                        />
                        <span
                            className={
                                isCompact
                                    ? 'px-1 text-center text-[11px] leading-tight text-muted-foreground'
                                    : 'px-1 text-center text-xs leading-tight text-muted-foreground'
                            }
                        >
                            {uploadZoneText}
                        </span>
                    </div>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    className={isCompact ? 'h-7 px-2 text-[11px]' : undefined}
                >
                    {hasFile ? replaceButtonLabel : uploadButtonLabel}
                </Button>
            </div>
            {error != null && error !== '' && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
