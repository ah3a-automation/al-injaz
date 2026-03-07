import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import type { Supplier, SupplierCapability, Certification } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { type FormEventHandler, useState, useCallback, useMemo } from 'react';

type TabId = 'basic' | 'legal' | 'financial' | 'categories' | 'capabilities';

interface EditProps {
    supplier: Supplier;
    categories: Array<{ id: number; name: string; name_ar: string | null }>;
    availableCapabilities: SupplierCapability[];
    availableCertifications: Certification[];
    saudiZones: Record<string, string>;
}

export default function Edit({
    supplier,
    categories,
    availableCapabilities,
    availableCertifications,
    saudiZones,
}: EditProps) {
    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [crCheckMessage, setCrCheckMessage] = useState<string | null>(null);

    const form = useForm({
        legal_name_en: supplier.legal_name_en,
        legal_name_ar: supplier.legal_name_ar ?? '',
        trade_name: supplier.trade_name ?? '',
        supplier_type: supplier.supplier_type,
        country: supplier.country,
        city: supplier.city,
        postal_code: supplier.postal_code ?? '',
        address: supplier.address ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        website: supplier.website ?? '',
        notes: supplier.notes ?? '',
        commercial_registration_no: supplier.commercial_registration_no ?? '',
        cr_expiry_date: supplier.cr_expiry_date ? supplier.cr_expiry_date.substring(0, 10) : '',
        vat_number: supplier.vat_number ?? '',
        unified_number: supplier.unified_number ?? '',
        business_license_number: supplier.business_license_number ?? '',
        license_expiry_date: supplier.license_expiry_date
            ? supplier.license_expiry_date.substring(0, 10)
            : '',
        chamber_of_commerce_number: supplier.chamber_of_commerce_number ?? '',
        classification_grade: supplier.classification_grade ?? '',
        bank_name: supplier.bank_name ?? '',
        bank_country: supplier.bank_country ?? '',
        bank_account_name: supplier.bank_account_name ?? '',
        bank_account_number: supplier.bank_account_number ?? '',
        iban: supplier.iban ?? '',
        swift_code: supplier.swift_code ?? '',
        preferred_currency: supplier.preferred_currency ?? '',
        payment_terms_days: supplier.payment_terms_days ?? '',
        credit_limit: supplier.credit_limit ?? '',
        tax_withholding_rate: supplier.tax_withholding_rate ?? '',
        risk_score: supplier.risk_score ?? '',
        category_ids: supplier.categories?.map((c) => c.id) ?? [],
    });

    const checkCr = useCallback(() => {
        const cr = form.data.commercial_registration_no?.trim();
        if (!cr) {
            setCrCheckMessage(null);
            return;
        }
        const url = `${route('suppliers.check-cr')}?cr_number=${encodeURIComponent(cr)}&supplier_id=${encodeURIComponent(supplier.id)}`;
        fetch(url)
            .then((res) => res.json())
            .then((data: { available?: boolean; message?: string }) => {
                setCrCheckMessage(data.message ?? null);
            })
            .catch(() => setCrCheckMessage('Check failed'));
    }, [form.data.commercial_registration_no, supplier.id]);

    const toggleCategory = (id: number) => {
        const next = form.data.category_ids.includes(id)
            ? form.data.category_ids.filter((c) => c !== id)
            : [...form.data.category_ids, id];
        form.setData('category_ids', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('suppliers.update', supplier.id));
    };

    const capForm = useForm({
        capabilities:
            supplier.capabilities?.map((c) => ({
                id: c.id,
                proficiency_level: (c.pivot?.proficiency_level ?? 'standard') as
                    | 'basic'
                    | 'standard'
                    | 'advanced'
                    | 'expert',
                years_experience: c.pivot?.years_experience ?? null,
            })) ?? [],
        certifications:
            supplier.certifications?.map((c) => ({
                id: c.id,
                certificate_number: c.pivot?.certificate_number ?? '',
                issued_at: c.pivot?.issued_at ?? '',
                expires_at: c.pivot?.expires_at ?? '',
            })) ?? [],
        zone_codes: supplier.zones?.map((z) => z.zone_code) ?? [],
        capacity: {
            max_contract_value: supplier.max_contract_value ?? '',
            workforce_size: supplier.workforce_size ?? '',
            equipment_list: supplier.equipment_list ?? '',
            capacity_notes: supplier.capacity_notes ?? '',
        },
    });

    const capabilitiesByCategory = useMemo(() => {
        const map = new Map<string, SupplierCapability[]>();
        for (const c of availableCapabilities) {
            const catName = c.category?.name ?? 'Other';
            if (!map.has(catName)) map.set(catName, []);
            map.get(catName)!.push(c);
        }
        return map;
    }, [availableCapabilities]);

    const toggleCapability = (cap: SupplierCapability) => {
        const existing = capForm.data.capabilities.find((x) => x.id === cap.id);
        if (existing) {
            capForm.setData(
                'capabilities',
                capForm.data.capabilities.filter((x) => x.id !== cap.id)
            );
        } else {
            capForm.setData('capabilities', [
                ...capForm.data.capabilities,
                {
                    id: cap.id,
                    proficiency_level: 'standard' as const,
                    years_experience: null as number | null,
                },
            ]);
        }
    };

    const updateCapabilityPivot = (capId: number, field: 'proficiency_level' | 'years_experience', value: string | number | null) => {
        capForm.setData(
            'capabilities',
            capForm.data.capabilities.map((c) =>
                c.id === capId ? { ...c, [field]: value } : c
            )
        );
    };

    const toggleCertification = (cert: Certification) => {
        const existing = capForm.data.certifications.find((x) => x.id === cert.id);
        if (existing) {
            capForm.setData(
                'certifications',
                capForm.data.certifications.filter((x) => x.id !== cert.id)
            );
        } else {
            capForm.setData('certifications', [
                ...capForm.data.certifications,
                {
                    id: cert.id,
                    certificate_number: '',
                    issued_at: '',
                    expires_at: '',
                },
            ]);
        }
    };

    const updateCertificationPivot = (
        certId: number,
        field: 'certificate_number' | 'issued_at' | 'expires_at',
        value: string
    ) => {
        capForm.setData(
            'certifications',
            capForm.data.certifications.map((c) =>
                c.id === certId ? { ...c, [field]: value } : c
            )
        );
    };

    const toggleZone = (zoneCode: string) => {
        const has = capForm.data.zone_codes.includes(zoneCode);
        capForm.setData(
            'zone_codes',
            has
                ? capForm.data.zone_codes.filter((z) => z !== zoneCode)
                : [...capForm.data.zone_codes, zoneCode]
        );
    };

    const submitCapabilities = (e: React.FormEvent) => {
        e.preventDefault();
        capForm.post(route('suppliers.capabilities.update', supplier.id));
    };

    const tabs: { id: TabId; label: string }[] = [
        { id: 'basic', label: 'Basic Info' },
        { id: 'legal', label: 'Legal & Compliance' },
        { id: 'financial', label: 'Financial' },
        { id: 'categories', label: 'Categories' },
        { id: 'capabilities', label: 'Capabilities & Regions' },
    ];

    return (
        <AppLayout>
            <Head title={`Edit ${supplier.legal_name_en}`} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Edit Supplier</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('suppliers.show', supplier.id)}>Cancel</Link>
                    </Button>
                </div>

                <div className="flex gap-2 border-b border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {activeTab === 'basic' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Info</CardTitle>
                                <CardDescription>Company and location.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="legal_name_en">Legal name (EN) *</Label>
                                    <Input
                                        id="legal_name_en"
                                        value={form.data.legal_name_en}
                                        onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                        required
                                    />
                                    {form.errors.legal_name_en && (
                                        <p className="text-sm text-destructive">{form.errors.legal_name_en}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="legal_name_ar">Legal name (AR)</Label>
                                    <Input
                                        id="legal_name_ar"
                                        value={form.data.legal_name_ar}
                                        onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="trade_name">Trade name</Label>
                                    <Input
                                        id="trade_name"
                                        value={form.data.trade_name}
                                        onChange={(e) => form.setData('trade_name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier_type">Type *</Label>
                                    <select
                                        id="supplier_type"
                                        value={form.data.supplier_type}
                                        onChange={(e) => form.setData('supplier_type', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="supplier">Supplier</option>
                                        <option value="subcontractor">Subcontractor</option>
                                        <option value="service_provider">Service Provider</option>
                                        <option value="consultant">Consultant</option>
                                    </select>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country *</Label>
                                        <Input
                                            id="country"
                                            value={form.data.country}
                                            onChange={(e) => form.setData('country', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City *</Label>
                                        <Input
                                            id="city"
                                            value={form.data.city}
                                            onChange={(e) => form.setData('city', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postal_code">Postal code</Label>
                                    <Input
                                        id="postal_code"
                                        value={form.data.postal_code}
                                        onChange={(e) => form.setData('postal_code', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <textarea
                                        id="address"
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        rows={2}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                    />
                                    {form.errors.email && (
                                        <p className="text-sm text-destructive">{form.errors.email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        type="url"
                                        value={form.data.website}
                                        onChange={(e) => form.setData('website', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <textarea
                                        id="notes"
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        rows={3}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'legal' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Legal & Compliance</CardTitle>
                                <CardDescription>CR number, VAT, licenses.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="commercial_registration_no">Commercial registration no</Label>
                                    <Input
                                        id="commercial_registration_no"
                                        value={form.data.commercial_registration_no}
                                        onChange={(e) => {
                                            form.setData('commercial_registration_no', e.target.value);
                                            setCrCheckMessage(null);
                                        }}
                                        onBlur={checkCr}
                                    />
                                    {crCheckMessage && (
                                        <p className={`text-sm ${crCheckMessage.includes('available') ? 'text-green-600' : 'text-destructive'}`}>
                                            {crCheckMessage}
                                        </p>
                                    )}
                                    {form.errors.commercial_registration_no && (
                                        <p className="text-sm text-destructive">{form.errors.commercial_registration_no}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cr_expiry_date">CR expiry date</Label>
                                    <Input
                                        id="cr_expiry_date"
                                        type="date"
                                        value={form.data.cr_expiry_date}
                                        onChange={(e) => form.setData('cr_expiry_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vat_number">VAT number</Label>
                                    <Input
                                        id="vat_number"
                                        value={form.data.vat_number}
                                        onChange={(e) => form.setData('vat_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unified_number">Unified number</Label>
                                    <Input
                                        id="unified_number"
                                        value={form.data.unified_number}
                                        onChange={(e) => form.setData('unified_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="business_license_number">Business license number</Label>
                                    <Input
                                        id="business_license_number"
                                        value={form.data.business_license_number}
                                        onChange={(e) => form.setData('business_license_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="license_expiry_date">License expiry date</Label>
                                    <Input
                                        id="license_expiry_date"
                                        type="date"
                                        value={form.data.license_expiry_date}
                                        onChange={(e) => form.setData('license_expiry_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="chamber_of_commerce_number">Chamber of commerce number</Label>
                                    <Input
                                        id="chamber_of_commerce_number"
                                        value={form.data.chamber_of_commerce_number}
                                        onChange={(e) => form.setData('chamber_of_commerce_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="classification_grade">Classification grade</Label>
                                    <Input
                                        id="classification_grade"
                                        value={form.data.classification_grade}
                                        onChange={(e) => form.setData('classification_grade', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'financial' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Financial</CardTitle>
                                <CardDescription>Bank and payment terms.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name">Bank name</Label>
                                    <Input
                                        id="bank_name"
                                        value={form.data.bank_name}
                                        onChange={(e) => form.setData('bank_name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank_country">Bank country</Label>
                                    <Input
                                        id="bank_country"
                                        value={form.data.bank_country}
                                        onChange={(e) => form.setData('bank_country', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank_account_name">Bank account name</Label>
                                    <Input
                                        id="bank_account_name"
                                        value={form.data.bank_account_name}
                                        onChange={(e) => form.setData('bank_account_name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank_account_number">Bank account number</Label>
                                    <Input
                                        id="bank_account_number"
                                        value={form.data.bank_account_number}
                                        onChange={(e) => form.setData('bank_account_number', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="iban">IBAN</Label>
                                        <Input
                                            id="iban"
                                            value={form.data.iban}
                                            onChange={(e) => form.setData('iban', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="swift_code">SWIFT code</Label>
                                        <Input
                                            id="swift_code"
                                            value={form.data.swift_code}
                                            onChange={(e) => form.setData('swift_code', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="preferred_currency">Preferred currency</Label>
                                    <Input
                                        id="preferred_currency"
                                        value={form.data.preferred_currency}
                                        onChange={(e) => form.setData('preferred_currency', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_terms_days">Payment terms (days)</Label>
                                    <select
                                        id="payment_terms_days"
                                        value={form.data.payment_terms_days === '' ? '' : String(form.data.payment_terms_days)}
                                        onChange={(e) =>
                                            form.setData(
                                                'payment_terms_days',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                            )
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="">—</option>
                                        <option value="30">30</option>
                                        <option value="60">60</option>
                                        <option value="90">90</option>
                                        <option value="120">120</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="credit_limit">Credit limit</Label>
                                    <Input
                                        id="credit_limit"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.data.credit_limit === '' ? '' : form.data.credit_limit}
                                        onChange={(e) =>
                                            form.setData(
                                                'credit_limit',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tax_withholding_rate">Tax withholding rate (%)</Label>
                                    <Input
                                        id="tax_withholding_rate"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        value={form.data.tax_withholding_rate === '' ? '' : form.data.tax_withholding_rate}
                                        onChange={(e) =>
                                            form.setData(
                                                'tax_withholding_rate',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="risk_score">Risk score (0–100)</Label>
                                    <Input
                                        id="risk_score"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={form.data.risk_score === '' ? '' : form.data.risk_score}
                                        onChange={(e) =>
                                            form.setData(
                                                'risk_score',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'categories' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Categories</CardTitle>
                                <CardDescription>Select one or more categories.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {categories.map((cat) => (
                                        <label
                                            key={cat.id}
                                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={form.data.category_ids.includes(cat.id)}
                                                onCheckedChange={() => toggleCategory(cat.id)}
                                            />
                                            <span className="text-sm">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'capabilities' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Capabilities & Regions</CardTitle>
                                <CardDescription>
                                    Capabilities, certifications, service zones, and capacity info.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-medium mb-3">Capabilities</h4>
                                        {Array.from(capabilitiesByCategory.entries()).map(([catName, caps]) => (
                                            <div key={catName} className="mb-4">
                                                <p className="text-sm text-muted-foreground mb-2">{catName}</p>
                                                <div className="space-y-2">
                                                    {caps.map((cap) => {
                                                        const selected = capForm.data.capabilities.some(
                                                            (c) => c.id === cap.id
                                                        );
                                                        return (
                                                            <div
                                                                key={cap.id}
                                                                className="flex flex-wrap items-center gap-2"
                                                            >
                                                                <Checkbox
                                                                    checked={selected}
                                                                    onCheckedChange={() => toggleCapability(cap)}
                                                                />
                                                                <span className="text-sm">{cap.name}</span>
                                                                {selected && (
                                                                    <>
                                                                        <Select
                                                                            value={
                                                                                capForm.data.capabilities.find(
                                                                                    (c) => c.id === cap.id
                                                                                )?.proficiency_level ?? 'standard'
                                                                            }
                                                                            onValueChange={(v) =>
                                                                                updateCapabilityPivot(
                                                                                    cap.id,
                                                                                    'proficiency_level',
                                                                                    v
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="w-[130px] h-8">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="basic">
                                                                                    Basic
                                                                                </SelectItem>
                                                                                <SelectItem value="standard">
                                                                                    Standard
                                                                                </SelectItem>
                                                                                <SelectItem value="advanced">
                                                                                    Advanced
                                                                                </SelectItem>
                                                                                <SelectItem value="expert">
                                                                                    Expert
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={100}
                                                                            placeholder="Years"
                                                                            className="w-20 h-8"
                                                                            value={
                                                                                capForm.data.capabilities.find(
                                                                                    (c) => c.id === cap.id
                                                                                )?.years_experience ?? ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                updateCapabilityPivot(
                                                                                    cap.id,
                                                                                    'years_experience',
                                                                                    e.target.value
                                                                                        ? parseInt(
                                                                                              e.target.value,
                                                                                              10
                                                                                          )
                                                                                        : null
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium mb-3">Certifications</h4>
                                        <div className="space-y-2">
                                            {availableCertifications.map((cert) => {
                                                const selected = capForm.data.certifications.some(
                                                    (c) => c.id === cert.id
                                                );
                                                return (
                                                    <div
                                                        key={cert.id}
                                                        className="flex flex-wrap items-center gap-2"
                                                    >
                                                        <Checkbox
                                                            checked={selected}
                                                            onCheckedChange={() => toggleCertification(cert)}
                                                        />
                                                        <span className="text-sm">{cert.name}</span>
                                                        {cert.issuing_body && (
                                                            <span className="text-xs text-muted-foreground">
                                                                ({cert.issuing_body})
                                                            </span>
                                                        )}
                                                        {selected && (
                                                            <>
                                                                <Input
                                                                    placeholder="Cert #"
                                                                    className="w-32 h-8 text-sm"
                                                                    value={
                                                                        capForm.data.certifications.find(
                                                                            (c) => c.id === cert.id
                                                                        )?.certificate_number ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateCertificationPivot(
                                                                            cert.id,
                                                                            'certificate_number',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                                <Input
                                                                    type="date"
                                                                    placeholder="Issued"
                                                                    className="w-36 h-8 text-sm"
                                                                    value={
                                                                        capForm.data.certifications.find(
                                                                            (c) => c.id === cert.id
                                                                        )?.issued_at?.slice(0, 10) ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateCertificationPivot(
                                                                            cert.id,
                                                                            'issued_at',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                                <Input
                                                                    type="date"
                                                                    placeholder="Expires"
                                                                    className="w-36 h-8 text-sm"
                                                                    value={
                                                                        capForm.data.certifications.find(
                                                                            (c) => c.id === cert.id
                                                                        )?.expires_at?.slice(0, 10) ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateCertificationPivot(
                                                                            cert.id,
                                                                            'expires_at',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium mb-3">Service Zones</h4>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                            {Object.entries(saudiZones).map(([code, name]) => (
                                                <label
                                                    key={code}
                                                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/50 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={capForm.data.zone_codes.includes(code)}
                                                        onCheckedChange={() => toggleZone(code)}
                                                    />
                                                    <span className="text-sm">{name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium mb-3">Capacity (SAR)</h4>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="cap_max_contract">Max Contract Value (SAR)</Label>
                                                <Input
                                                    id="cap_max_contract"
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={capForm.data.capacity.max_contract_value}
                                                    onChange={(e) =>
                                                        capForm.setData('capacity', {
                                                            ...capForm.data.capacity,
                                                            max_contract_value:
                                                                e.target.value === ''
                                                                    ? ''
                                                                    : Number(e.target.value),
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="cap_workforce">Workforce Size</Label>
                                                <Input
                                                    id="cap_workforce"
                                                    type="number"
                                                    min={0}
                                                    value={capForm.data.capacity.workforce_size}
                                                    onChange={(e) =>
                                                        capForm.setData('capacity', {
                                                            ...capForm.data.capacity,
                                                            workforce_size:
                                                                e.target.value === ''
                                                                    ? ''
                                                                    : Number(e.target.value),
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="cap_equipment">Equipment List</Label>
                                            <textarea
                                                id="cap_equipment"
                                                rows={3}
                                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                                value={capForm.data.capacity.equipment_list}
                                                onChange={(e) =>
                                                    capForm.setData('capacity', {
                                                        ...capForm.data.capacity,
                                                        equipment_list: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="cap_notes">Capacity Notes</Label>
                                            <textarea
                                                id="cap_notes"
                                                rows={2}
                                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                                value={capForm.data.capacity.capacity_notes}
                                                onChange={(e) =>
                                                    capForm.setData('capacity', {
                                                        ...capForm.data.capacity,
                                                        capacity_notes: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() => capForm.post(route('suppliers.capabilities.update', supplier.id))}
                                        disabled={capForm.processing}
                                    >
                                        {capForm.processing ? (
                                            <span className="flex items-center gap-2">
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                Saving…
                                            </span>
                                        ) : (
                                            'Save Capabilities'
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Save changes
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('suppliers.show', supplier.id)}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
