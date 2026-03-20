import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { User, Mail, Phone, Pencil } from 'lucide-react';

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
    if (!contact) {
        return (
            <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4" />
                        Primary Contact
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No primary contact set.</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link href={route('supplier.contact.profile')}>Add Contact</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Primary Contact
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium">{contact.name}</p>
                        {contact.job_title && <p className="text-xs text-muted-foreground">{contact.job_title}</p>}
                        {contact.email && (
                            <a href={`mailto:${contact.email}`} className="mt-1 flex items-center gap-1 text-xs text-primary underline">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                            </a>
                        )}
                        {contact.phone && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                            </p>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={route('supplier.contact.profile')}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit Contact
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
