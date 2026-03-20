import type { Supplier, SupplierContact } from '@/types';
import ContactCard from '@/Components/Supplier/Contacts/ContactCard';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Link, router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface ContactsSectionProps {
    supplier: Supplier;
    canEdit?: boolean;
    addContactHref?: string | null;
    addContactLabel?: string | null;
    showInlineManageActions?: boolean;
}

export function ContactsSection({
    supplier,
    canEdit = false,
    addContactHref,
    addContactLabel,
    showInlineManageActions,
}: ContactsSectionProps) {
    const { t } = useLocale();
    const contacts = supplier.contacts ?? [];
    const effectiveAddContactHref = addContactHref ?? (canEdit ? route('suppliers.edit', supplier.id) + '#contacts' : null);
    const effectiveAddContactLabel = addContactLabel ?? t('add_contact', 'suppliers');
    const allowInlineManageActions = showInlineManageActions ?? canEdit;

    const totalContacts = contacts.length;
    const hasPrimary = contacts.some((c) => c.is_primary);
    const hasFinance = contacts.some((c) => c.contact_type === 'finance');
    const hasTechnical = contacts.some((c) => c.contact_type === 'technical');
    const hasSales = contacts.some((c) => c.contact_type === 'sales');

    const sortedContacts = [...contacts].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        if (a.contact_type < b.contact_type) return -1;
        if (a.contact_type > b.contact_type) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                    {t('section_contacts', 'suppliers') ?? 'Contacts'}
                </CardTitle>
                {effectiveAddContactHref && (
                    <Button size="sm" asChild>
                        <Link href={effectiveAddContactHref}>
                            <Plus className="h-4 w-4" />
                            {effectiveAddContactLabel}
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary strip */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('contacts_count', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium tabular-nums">{totalContacts}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('primary_contact_present', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">
                            {hasPrimary ? t('yes', 'suppliers') : t('no', 'suppliers')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('finance_contact_present', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">
                            {hasFinance ? t('yes', 'suppliers') : t('no', 'suppliers')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('technical_contact_present', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">
                            {hasTechnical ? t('yes', 'suppliers') : t('no', 'suppliers')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            {t('sales_contact_present', 'suppliers')}
                        </p>
                        <p className="mt-1 font-medium">
                            {hasSales ? t('yes', 'suppliers') : t('no', 'suppliers')}
                        </p>
                    </div>
                </div>

                {/* Coverage warnings */}
                {totalContacts === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('no_contacts_yet', 'suppliers') ?? 'No contacts yet.'}
                    </p>
                ) : (
                    <>
                        {(!hasPrimary || !hasFinance || !hasTechnical || !hasSales) && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                {!hasPrimary && (
                                    <p>{t('warning_no_primary_contact', 'suppliers')}</p>
                                )}
                                {!hasFinance && (
                                    <p>{t('warning_no_finance_contact', 'suppliers')}</p>
                                )}
                                {!hasTechnical && (
                                    <p>{t('warning_no_technical_contact', 'suppliers')}</p>
                                )}
                                {!hasSales && (
                                    <p>{t('warning_no_sales_contact', 'suppliers')}</p>
                                )}
                            </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                            {sortedContacts.map((contact: SupplierContact) => (
                                <ContactCard
                                    key={contact.id}
                                    contact={contact}
                                    showEditAction={allowInlineManageActions}
                                    editHref={allowInlineManageActions ? route('suppliers.edit', supplier.id) + '#contacts' : undefined}
                                    allowSetPrimary={allowInlineManageActions}
                                    setPrimaryHref={
                                        allowInlineManageActions
                                            ? route('suppliers.contacts.set-primary', [supplier.id, contact.id])
                                            : undefined
                                    }
                                    renderActions={
                                        allowInlineManageActions
                                            ? (c) => (
                                                  <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 px-2 text-xs text-destructive"
                                                      type="button"
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
                                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                      {t('action_delete', 'suppliers')}
                                                  </Button>
                                              )
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
