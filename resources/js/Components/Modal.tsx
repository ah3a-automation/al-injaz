import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { PropsWithChildren, useEffect, useRef } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    onClose: CallableFunction;
}>) {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (show) {
            previousFocusRef.current = document.activeElement as HTMLElement | null;
        } else if (previousFocusRef.current) {
            const el = previousFocusRef.current;
            previousFocusRef.current = null;
            requestAnimationFrame(() => {
                el?.focus?.();
            });
        }
    }, [show]);

    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <>
            <style>{`[data-radix-popper-content-wrapper] { z-index: 9999 !important; }`}</style>
            <Transition show={show} leave="duration-200">
                <Dialog
                    as="div"
                    id="modal"
                    className="fixed inset-0 z-[2100] flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0 pointer-events-none"
                    onClose={close}
                >
                    <TransitionChild
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="absolute inset-0 z-[2090] bg-gray-500/75 pointer-events-auto" />
                    </TransitionChild>

                    <TransitionChild
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <DialogPanel
                            className={`relative z-[2100] mb-6 transform overflow-visible rounded-lg bg-white shadow-xl transition-all sm:mx-auto sm:w-full pointer-events-auto ${maxWidthClass}`}
                        >
                            {children}
                        </DialogPanel>
                    </TransitionChild>
                </Dialog>
            </Transition>
        </>
    );
}
