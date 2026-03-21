import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Link } from '@inertiajs/react';
import { User, Pencil, Mail, Phone, Smartphone } from 'lucide-react';
import BusinessCardPreviewModal from '@/Components/Supplier/BusinessCardPreviewModal';
import { useState } from 'react';

const CONTACT_TYPE_LABELS: Record<string, string> = {
    sales: 'Sales',
    technical: 'Technical',
    finance: 'Finance',
    contracts: 'Contracts',
    management: 'Management',
};

interface ContactCardProps {
    contact: {
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
    };
}

export default function ContactCard({ contact }: ContactCardProps) {
    const [previewModal, setPreviewModal] = useState<'front' | 'back' | null>(null);
    const typeLabel = CONTACT_TYPE_LABELS[contact.contact_type] ?? contact.contact_type;

    return (
        <>
            <Card className="rounded-xl shadow-sm">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                            {contact.avatar_url ? (
                                <img src={contact.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <User className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold">{contact.name}</h4>
                                {contact.is_primary && (
                                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                            </div>
                            {contact.job_title && <p className="text-sm text-muted-foreground">{contact.job_title}</p>}
                            {contact.department && <p className="text-xs text-muted-foreground">{contact.department}</p>}
                            <p className="mt-1 text-xs text-muted-foreground">{typeLabel}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary underline">
                                        <Mail className="h-3.5 w-3.5" />
                                        {contact.email}
                                    </a>
                                )}
                                {contact.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                        {contact.phone}
                                    </span>
                                )}
                                {contact.mobile && (
                                    <span className="flex items-center gap-1">
                                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                                        {contact.mobile}
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={route('supplier.contact.profile')}>
                                        <Pencil className="me-1 h-3.5 w-3.5" />
                                        Edit
                                    </Link>
                                </Button>
                                {contact.business_card_front_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPreviewModal('front')}
                                    >
                                        Card Front
                                    </Button>
                                )}
                                {contact.business_card_back_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPreviewModal('back')}
                                    >
                                        Card Back
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <BusinessCardPreviewModal
                open={previewModal === 'front'}
                onClose={() => setPreviewModal(null)}
                imageUrl={contact.business_card_front_url ?? null}
                title="Business Card (Front)"
                downloadFileName={`${contact.name}-card-front.jpg`}
            />
            <BusinessCardPreviewModal
                open={previewModal === 'back'}
                onClose={() => setPreviewModal(null)}
                imageUrl={contact.business_card_back_url ?? null}
                title="Business Card (Back)"
                downloadFileName={`${contact.name}-card-back.jpg`}
            />
        </>
    );
}
