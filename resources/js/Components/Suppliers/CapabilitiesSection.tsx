import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import type { Supplier } from '@/types';
import { formatCurrency } from '@/utils/suppliers';
import { useState } from 'react';

type CapTab = 'certifications' | 'capacity';

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function CapabilitiesSection({ supplier }: { supplier: Supplier }) {
    const [activeTab, setActiveTab] = useState<CapTab>('certifications');
    const today = new Date().toISOString().slice(0, 10);
    const { t } = useLocale();

    const getExpiryBadge = (expiresAt: string | null) => {
        if (!expiresAt) return null;

        const expiry = new Date(expiresAt).toISOString().slice(0, 10);
        if (expiry < today) {
            return {
                label: t('expired', 'suppliers'),
                class: 'bg-red-100 text-red-800',
            };
        }

        const daysLeft = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 60) {
            return {
                label: t('expiring_soon', 'suppliers', { date: expiry }),
                class: 'bg-amber-100 text-amber-800',
            };
        }

        return {
            label: t('valid_until', 'suppliers', { date: expiry }),
            class: 'bg-green-100 text-green-800',
        };
    };

    const tabs: Array<{ id: CapTab; label: string }> = [
        { id: 'certifications', label: t('tab_certifications', 'suppliers') },
        { id: 'capacity', label: t('tab_capacity', 'suppliers') },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('section_certifications', 'suppliers')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex gap-2 border-b border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'certifications' && (
                    <div>
                        {supplier.certifications && supplier.certifications.length > 0 ? (
                            <ul className="space-y-3">
                                {supplier.certifications.map((certification) => (
                                    <li key={certification.id} className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{certification.name}</span>
                                        {certification.issuing_body && (
                                            <span className="text-sm text-muted-foreground">
                                                ({certification.issuing_body})
                                            </span>
                                        )}
                                        {certification.pivot?.certificate_number && (
                                            <span className="text-sm">
                                                Cert #: {certification.pivot.certificate_number}
                                            </span>
                                        )}
                                        {certification.pivot?.expires_at && (
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${getExpiryBadge(certification.pivot.expires_at)?.class ?? ''}`}
                                            >
                                                {getExpiryBadge(certification.pivot.expires_at)?.label}
                                            </span>
                                        )}
                                        {certification.pivot?.is_verified && (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                                ✓ Verified
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('no_certifications', 'suppliers')}
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'capacity' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('capacity_max_contract', 'suppliers')}
                            </p>
                            <p className="font-medium">
                                {supplier.max_contract_value != null ? (
                                    <span dir="ltr" className="font-mono tabular-nums">
                                        {formatCurrency(supplier.max_contract_value, 'SAR')}
                                    </span>
                                ) : (
                                    '—'
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('capacity_workforce', 'suppliers')}
                            </p>
                            <p className="font-medium">
                                {supplier.workforce_size != null
                                    ? t('capacity_workforce_value', 'suppliers', {
                                          count: supplier.workforce_size,
                                      })
                                    : '—'}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">
                                {t('capacity_equipment', 'suppliers')}
                            </p>
                            <p className="text-sm">{supplier.equipment_list || '—'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">
                                {t('capacity_notes', 'suppliers')}
                            </p>
                            <p className="text-sm">{supplier.capacity_notes || '—'}</p>
                        </div>
                        {supplier.capacity_updated_at && (
                            <p className="col-span-2 text-xs text-muted-foreground">
                                {t('capacity_last_updated', 'suppliers', {
                                    date: formatDate(supplier.capacity_updated_at),
                                })}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
