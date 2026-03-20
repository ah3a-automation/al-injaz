import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { ImageCropModal } from '@/Components/ImageCropModal';

export interface MediaUploaderProps {
    /** Current file (for form submission). */
    value: File | null;
    /** Current preview URL (existing media or blob URL). */
    previewUrl: string | null;
    /** Called when user selects/crops a new file or clears. */
    onChange: (file: File | null) => void;
    /** Crop aspect: 1 = square (avatar/logo), 1.6 = business card, undefined = free ratio. */
    aspect?: number;
    /** Input accept (e.g. "image/*"). */
    accept?: string;
    /** Max file size in bytes. */
    maxSizeBytes?: number;
    /** Label above the area. */
    label?: string;
    /** Hint text. */
    hint?: string;
    /** Shape of preview: 'circle' | 'rounded' | 'square'. */
    shape?: 'circle' | 'rounded' | 'square';
    /** Show delete button when there is a preview. */
    showDelete?: boolean;
    /** Optional progress 0–100 (e.g. from parent upload). */
    progress?: number;
    /** Disabled state. */
    disabled?: boolean;
    /** Preview size class (e.g. h-24 w-24). */
    previewSize?: string;
    /** Optional icon component when empty. */
    emptyIcon?: React.ComponentType<{ className?: string }>;
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2MB

export function MediaUploader({
    value,
    previewUrl,
    onChange,
    aspect = 1,
    accept = 'image/*',
    maxSizeBytes = DEFAULT_MAX_BYTES,
    label,
    hint,
    shape = 'rounded',
    showDelete = true,
    progress,
    disabled = false,
    previewSize = 'h-24 w-24',
    emptyIcon: EmptyIcon,
}: MediaUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const shapeClass =
        shape === 'circle'
            ? 'rounded-full'
            : shape === 'rounded'
              ? 'rounded-lg'
              : 'rounded-none';

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > maxSizeBytes) {
                setError(`File must be under ${Math.round(maxSizeBytes / 1024)} KB`);
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            if (aspect !== undefined) {
                setCropState({ src: URL.createObjectURL(file), fileName: file.name });
            } else {
                onChange(file);
            }
            e.target.value = '';
        },
        [aspect, maxSizeBytes, onChange]
    );

    const onCropComplete = useCallback(
        (file: File) => {
            onChange(file);
            if (cropState?.src) URL.revokeObjectURL(cropState.src);
            setCropState(null);
        },
        [onChange, cropState?.src]
    );

    const onCropCancel = useCallback(() => {
        if (cropState?.src) URL.revokeObjectURL(cropState.src);
        setCropState(null);
    }, [cropState?.src]);

    const handleRemove = useCallback(() => {
        onChange(null);
        setError(null);
        inputRef.current?.form?.reset();
    }, [onChange]);

    const hasPreview = Boolean(previewUrl || value);
    const [valueBlobUrl, setValueBlobUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!value || previewUrl) {
            setValueBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            return;
        }
        const url = URL.createObjectURL(value);
        setValueBlobUrl(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [value, previewUrl]);
    const displayUrl = previewUrl ?? valueBlobUrl ?? null;

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-foreground">{label}</label>
            )}
            {hint && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
                <div
                    className={`${previewSize} shrink-0 border border-border bg-muted/30 flex items-center justify-center overflow-hidden ${shapeClass}`}
                >
                    {displayUrl ? (
                        <img
                            src={displayUrl}
                            alt=""
                            className={`w-full h-full object-cover ${shapeClass}`}
                        />
                    ) : EmptyIcon ? (
                        <EmptyIcon className="h-10 w-10 text-muted-foreground" />
                    ) : (
                        <span className="text-xs text-muted-foreground">No file</span>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={disabled}
                    />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                            disabled={disabled}
                        >
                            {hasPreview ? 'Replace' : 'Upload'}
                        </Button>
                        {showDelete && hasPreview && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemove}
                                disabled={disabled}
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                    {progress !== undefined && progress < 100 && progress > 0 && (
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
            {cropState && (
                <ImageCropModal
                    imageSrc={cropState.src}
                    aspect={aspect}
                    fileName={cropState.fileName}
                    onComplete={onCropComplete}
                    onCancel={onCropCancel}
                />
            )}
        </div>
    );
}
