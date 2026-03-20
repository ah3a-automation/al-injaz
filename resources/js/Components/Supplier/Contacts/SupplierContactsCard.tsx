import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { Users, UserPlus } from 'lucide-react';
import ContactCard from './ContactCard';
import { useLocale } from '@/hooks/useLocale';

interface Contact {
    id: string;
    name: string;
    job_title: string | null;
    department: string | null;
    contact_type: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    is_primary: boolean;
    avatar_url?: string | null;
    business_card_front_url?: string | null;
    business_card_back_url?: string | null;
}

interface SupplierContactsCardProps {
    contacts: Contact[];
    contactsTotal?: number;
}

export default function SupplierContactsCard({ contacts, contactsTotal = 0 }: SupplierContactsCardProps) {
    const { t } = useLocale();
    const total = contactsTotal > 0 ? contactsTotal : contacts.length;
    const hasMore = total > contacts.length;

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {t('profile_contacts', 'supplier_portal')}
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8" asChild>
                    <Link href={route('supplier.contacts.create')}>
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        {t('add_contact', 'supplier_portal')}
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-4">
                {contacts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('profile_no_contacts_yet', 'supplier_portal')}
                        </p>
                        <Button variant="outline" size="sm" className="mt-3 h-8" asChild>
                            <Link href={route('supplier.contacts.create')}>
                                <UserPlus className="mr-1.5 h-4 w-4" />
                                {t('add_contact', 'supplier_portal')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2">
                            {contacts.map((c) => (
                                <ContactCard key={c.id} contact={c} />
                            ))}
                        </div>
                        {hasMore && (
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                                {t('profile_showing_contacts', 'supplier_portal', { count: contacts.length, total })}
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
