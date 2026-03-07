import type { Supplier, SupplierContact } from '@/types';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Link, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface ContactsSectionProps {
    supplier: Supplier;
    canEdit: boolean;
}

export function ContactsSection({ supplier, canEdit }: ContactsSectionProps) {
    const contacts = supplier.contacts ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Contacts</CardTitle>
                {canEdit && (
                    <Button size="sm" asChild>
                        <Link href={route('suppliers.show', supplier.id)}>
                            <Plus className="h-4 w-4" />
                            Add
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contacts yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {contacts.map((c: SupplierContact) => (
                            <li
                                key={c.id}
                                className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 p-3"
                            >
                                <div>
                                    <p className="font-medium">{c.name}</p>
                                    {c.job_title && (
                                        <p className="text-sm text-muted-foreground">{c.job_title}</p>
                                    )}
                                    {c.email && (
                                        <p className="text-sm">{c.email}</p>
                                    )}
                                    {c.phone && (
                                        <p className="text-sm">{c.phone}</p>
                                    )}
                                    {c.is_primary && (
                                        <span className="mt-1 inline-block text-xs font-medium text-primary">
                                            Primary
                                        </span>
                                    )}
                                </div>
                                {canEdit && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" aria-label="Edit contact">
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            aria-label="Delete contact"
                                            onClick={() => {
                                                if (confirm('Delete this contact?')) {
                                                    router.delete(
                                                        route('suppliers.contacts.destroy', [
                                                            supplier.id,
                                                            c.id,
                                                        ])
                                                    );
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
