import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/Components/ui/button';
import { getCroppedBlob, blobToFile, type Area as CropArea } from '@/utils/cropImage';
import { useLocale } from '@/hooks/useLocale';

interface ImageCropperProps {
    file: File;
    open: boolean;
    onCancel: () => void;
    onCropComplete: (croppedFile: File) => void;
}

export function ImageCropper({ file, open, onCancel, onCropComplete }: ImageCropperProps) {
    const { t } = useLocale();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
    }, [file, open]);

    const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setLoading(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
            const croppedFile = blobToFile(blob, file.name);
            onCropComplete(croppedFile);
        } finally {
            setLoading(false);
        }
    }, [imageSrc, croppedAreaPixels, file.name, onCropComplete]);

    if (!open || !imageSrc) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-card shadow-lg">
                <div className="relative h-80 shrink-0 bg-muted">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>
                <div className="flex flex-col gap-3 border-t border-border p-4">
                    <label className="text-sm font-medium text-muted-foreground">
                        {t('crop_zoom', 'supplier_portal')}
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="ml-2 w-32 align-middle"
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                            {t('crop_cancel', 'supplier_portal')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || !croppedAreaPixels}
                        >
                            {loading
                                ? t('crop_saving', 'supplier_portal')
                                : t('crop_apply', 'supplier_portal')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

