import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { Users, UserPlus } from 'lucide-react';
import ContactCard from '@/Components/Supplier/ContactCard';

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
}

export default function SupplierContactsCard({ contacts }: SupplierContactsCardProps) {
    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Contacts
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('supplier.contact.profile')}>
                        <UserPlus className="me-2 h-4 w-4" />
                        Add Contact
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contacts yet.</p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {contacts.map((c) => (
                            <ContactCard key={c.id} contact={c} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
