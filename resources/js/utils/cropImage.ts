export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
}

export async function getCroppedBlob(
    imageSrc: string,
    pixelCrop: Area,
    mimeType: string = 'image/jpeg',
    quality: number = 0.85
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context not available');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            },
            mimeType,
            quality
        );
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (e) => reject(e));
        image.src = url;
    });
}

export function blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: blob.type });
}
