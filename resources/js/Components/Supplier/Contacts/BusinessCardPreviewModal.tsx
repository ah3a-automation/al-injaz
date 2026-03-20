import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { Button } from '@/Components/ui/button';
import { Download, X } from 'lucide-react';

interface BusinessCardPreviewModalProps {
    open: boolean;
    onClose: () => void;
    imageUrl: string | null;
    title?: string;
    downloadFileName?: string;
}

export default function BusinessCardPreviewModal({
    open,
    onClose,
    imageUrl,
    title = 'Business Card',
    downloadFileName = 'business-card.jpg',
}: BusinessCardPreviewModalProps) {
    return (
        <Transition show={open}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <DialogPanel className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-xl">
                            <div className="flex items-center justify-between border-b p-4">
                                <h3 className="font-semibold">{title}</h3>
                                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="p-4">
                                {imageUrl ? (
                                    <img src={imageUrl} alt={title} className="mx-auto max-h-[70vh] w-auto rounded-lg border object-contain" />
                                ) : (
                                    <p className="py-8 text-center text-muted-foreground">No image available.</p>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 border-t p-4">
                                {imageUrl && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={imageUrl} download={downloadFileName}><Download className="mr-2 h-4 w-4" /> Download</a>
                                    </Button>
                                )}
                                <Button variant="default" size="sm" onClick={onClose}>Close</Button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}
