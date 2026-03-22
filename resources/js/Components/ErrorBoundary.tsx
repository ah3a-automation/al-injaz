import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/Components/ui/button';

/** Mirrors lang/en|ar/ui.php — error_boundary_* (used when props.labels omitted). */
const FALLBACK_COPY: Record<
    'en' | 'ar',
    { title: string; message: string; reload: string }
> = {
    en: {
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try reloading the page.',
        reload: 'Reload page',
    },
    ar: {
        title: 'حدث خطأ ما',
        message: 'حدث خطأ غير متوقع. يُرجى إعادة تحميل الصفحة.',
        reload: 'إعادة تحميل الصفحة',
    },
};

export interface ErrorBoundaryLabels {
    title: string;
    message: string;
    reload: string;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    /** When set, used for copy instead of FALLBACK_COPY + locale */
    labels?: ErrorBoundaryLabels;
    locale?: 'en' | 'ar';
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }
    }

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback !== undefined) {
                return this.props.fallback;
            }

            const loc = this.props.locale === 'ar' ? 'ar' : 'en';
            const copy = this.props.labels ?? FALLBACK_COPY[loc];

            return (
                <div className="flex min-h-[50vh] items-center justify-center p-6">
                    <div
                        role="alert"
                        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm"
                    >
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            {copy.title}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">{copy.message}</p>
                        <Button
                            type="button"
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            {copy.reload}
                        </Button>
                        {import.meta.env.DEV && this.state.error != null && (
                            <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-destructive whitespace-pre-wrap break-all">
                                {this.state.error.stack ?? this.state.error.message}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
