import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { User, Mail, Phone, Pencil } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { displayLowercase, displayTitleCase } from '@/utils/textDisplay';

interface PrimaryContactCardProps {
    contact: {
        id: string;
        name: string;
        job_title: string | null;
        email: string | null;
        phone: string | null;
        avatar_url?: string | null;
    } | null;
}

export default function PrimaryContactCard({ contact }: PrimaryContactCardProps) {
    const { t } = useLocale();

    if (!contact) {
        return (
            <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
                <CardHeader className="border-b border-border/40 px-4 py-2.5">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t('profile_primary_contact', 'supplier_portal')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('profile_no_primary_contact', 'supplier_portal')}</p>
                    <Button variant="outline" size="sm" className="mt-2 h-8" asChild>
                        <Link href={route('supplier.contact.profile')}>{t('add_contact', 'supplier_portal')}</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t('profile_primary_contact', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
                <div className="flex gap-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{displayTitleCase(contact.name)}</p>
                        {contact.job_title && (
                            <p className="text-xs text-muted-foreground">{displayTitleCase(contact.job_title)}</p>
                        )}
                        {contact.email && (
                            <a
                                href={`mailto:${contact.email}`}
                                className="mt-1 flex items-center gap-1 text-xs text-primary underline"
                            >
                                <Mail className="h-3 w-3 shrink-0" />
                                {displayLowercase(contact.email)}
                            </a>
                        )}
                        {contact.phone && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                {contact.phone}
                            </p>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 w-full text-xs" asChild>
                    <Link href={route('supplier.contact.profile')}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {t('profile_edit_contact', 'supplier_portal')}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
