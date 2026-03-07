import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import { CheckCircle } from 'lucide-react';

interface SupplierSuccessProps {
    supplier_code: string;
    email: string | null;
    message: string;
}

export default function SupplierSuccess({ supplier_code, email, message }: SupplierSuccessProps) {
    const [copied, setCopied] = useState(false);

    function copyCode() {
        if (!supplier_code) return;
        navigator.clipboard.writeText(supplier_code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const statusUrl = `/supplier/status?code=${encodeURIComponent(supplier_code)}&email=${encodeURIComponent(email ?? '')}`;

    return (
        <GuestSupplierLayout title="Registration Submitted">
            <Head title="Registration Submitted" />
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-600" aria-hidden />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                    Registration Submitted Successfully!
                </h1>
                <p className="mt-2 text-muted-foreground">{message}</p>
                {supplier_code && (
                    <div className="mt-6 w-full rounded-lg bg-muted p-4 text-center">
                        <p className="text-xs text-muted-foreground">Your supplier code</p>
                        <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
                            {supplier_code}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={copyCode}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                )}
                <p className="mt-6 text-sm text-muted-foreground">
                    Your application is under review. We will notify you by email.
                </p>
                {email && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        Confirmation sent to: {email}
                    </p>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild>
                        <Link href={statusUrl}>Check Registration Status</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/">Return to Home</Link>
                    </Button>
                </div>
            </div>
        </GuestSupplierLayout>
    );
}
