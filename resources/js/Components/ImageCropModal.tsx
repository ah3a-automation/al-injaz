import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/Components/ui/button';
import { getCroppedBlob, blobToFile, type Area as CropArea } from '@/utils/cropImage';

interface ImageCropModalProps {
    imageSrc: string;
    /** 1 = square (avatar/logo), 1.6 = business card, undefined = free ratio */
    aspect?: number;
    onComplete: (file: File) => void;
    onCancel: () => void;
    fileName?: string;
}

export function ImageCropModal({ imageSrc, aspect = 1, onComplete, onCancel, fileName = 'image.jpg' }: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
    const [loading, setLoading] = useState(false);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return;
        setLoading(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
            const file = blobToFile(blob, fileName);
            onComplete(file);
        } finally {
            setLoading(false);
        }
    }, [imageSrc, croppedAreaPixels, fileName, onComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-card rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="relative h-80 shrink-0 bg-muted">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>
                <div className="p-4 flex flex-col gap-3 border-t border-border">
                    <label className="text-sm font-medium text-muted-foreground">
                        Zoom
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
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleConfirm} disabled={loading || !croppedAreaPixels}>
                            {loading ? 'Saving…' : 'Apply'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
