import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';

interface Props {
    label: string;
    value: number;
    description?: string;
    icon: LucideIcon;
    href?: string;
    variant?: 'default' | 'warning' | 'danger';
}

export function KpiCard({ label, value, description, icon: Icon, href, variant = 'default' }: Props) {
    const variantClasses: Record<'default' | 'warning' | 'danger', string> = {
        default: 'text-primary',
        warning: 'text-amber-600',
        danger: 'text-red-600',
    };

    const content = (
        <Card className={`transition-shadow hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {label}
                        </p>
                        <p className={`mt-1 text-3xl font-bold tabular-nums ${variantClasses[variant]}`}>
                            {value.toLocaleString()}
                        </p>
                        {description && (
                            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div
                        className={`rounded-lg p-2 ${
                            variant === 'danger'
                                ? 'bg-red-50'
                                : variant === 'warning'
                                  ? 'bg-amber-50'
                                  : 'bg-primary/10'
                        }`}
                    >
                        <Icon className={`h-5 w-5 ${variantClasses[variant]}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (!href) {
        return content;
    }

    return (
        <Link href={href}>
            {content}
        </Link>
    );
}

