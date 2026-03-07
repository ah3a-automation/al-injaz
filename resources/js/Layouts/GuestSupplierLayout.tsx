import { Link } from '@inertiajs/react';

interface GuestSupplierLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function GuestSupplierLayout({ children, title }: GuestSupplierLayoutProps) {
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="border-b border-border bg-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold">Al Injaz</span>
                        {title && (
                            <span className="text-muted-foreground text-sm hidden sm:inline">
                                {title}
                            </span>
                        )}
                    </div>
                    <Link
                        href="/supplier/status"
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Check Registration Status →
                    </Link>
                </div>
            </nav>
            <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
            <footer className="py-6 text-center text-sm text-muted-foreground">
                © {year} Al Injaz. All rights reserved.
            </footer>
        </div>
    );
}
