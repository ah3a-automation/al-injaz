import { Head, useForm } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { WizardProgress, type WizardStep } from '@/Components/Suppliers/WizardProgress';
import { isValidEmail, isValidUrl } from '@/utils/suppliers';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';
import {
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2,
    XCircle,
    AlertCircle,
} from 'lucide-react';

interface ContactFormItem {
    name: string;
    job_title: string;
    department: string;
    contact_type: string;
    email: string;
    phone: string;
    mobile: string;
    is_primary: boolean;
}

interface RegistrationForm {
    legal_name_en: string;
    legal_name_ar: string;
    trade_name: string;
    supplier_type: string;
    country: string;
    city: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    category_ids: number[];
    commercial_registration_no: string;
    cr_expiry_date: string;
    vat_number: string;
    unified_number: string;
    business_license_number: string;
    license_expiry_date: string;
    chamber_of_commerce_number: string;
    classification_grade: string;
    contacts: ContactFormItem[];
    bank_name: string;
    bank_country: string;
    bank_account_name: string;
    bank_account_number: string;
    iban: string;
    swift_code: string;
    preferred_currency: string;
    payment_terms_days: string;
}

const emptyContact: ContactFormItem = {
    name: '',
    job_title: '',
    department: '',
    contact_type: 'sales',
    email: '',
    phone: '',
    mobile: '',
    is_primary: true,
};

interface SupplierRegisterProps {
    categories: Array<{ id: number; name: string; name_ar: string | null; slug: string }>;
}

const STEPS: WizardStep[] = [
    { label: 'Company Info' },
    { label: 'Legal' },
    { label: 'Contacts' },
    { label: 'Bank Details' },
    { label: 'Review' },
];

const TOTAL_STEPS = 5;

export default function SupplierRegister({ categories }: SupplierRegisterProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [crStatus, setCrStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [declared, setDeclared] = useState(false);

    const form = useForm<RegistrationForm>({
        legal_name_en: '',
        legal_name_ar: '',
        trade_name: '',
        supplier_type: 'supplier',
        country: '',
        city: '',
        postal_code: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        category_ids: [],
        commercial_registration_no: '',
        cr_expiry_date: '',
        vat_number: '',
        unified_number: '',
        business_license_number: '',
        license_expiry_date: '',
        chamber_of_commerce_number: '',
        classification_grade: '',
        contacts: [{ ...emptyContact }],
        bank_name: '',
        bank_country: '',
        bank_account_name: '',
        bank_account_number: '',
        iban: '',
        swift_code: '',
        preferred_currency: 'SAR',
        payment_terms_days: '',
    });

    const checkCrAvailability = useCallback(async (value: string) => {
        if (!value.trim()) {
            setCrStatus('idle');
            return;
        }
        setCrStatus('checking');
        const res = await fetch(
            `/register/supplier/check-cr?cr_number=${encodeURIComponent(value)}`
        );
        const data = (await res.json()) as { available: boolean };
        setCrStatus(data.available ? 'available' : 'taken');
    }, []);

    function validateStep(step: number): boolean {
        if (step === 1) {
            if (!form.data.legal_name_en.trim()) return false;
            if (!form.data.supplier_type) return false;
            if (!form.data.country.trim()) return false;
            if (!form.data.city.trim()) return false;
            if (!form.data.email.trim() || !isValidEmail(form.data.email)) return false;
            if (form.data.website && !isValidUrl(form.data.website)) return false;
            return true;
        }
        if (step === 2) {
            if (!form.data.commercial_registration_no.trim()) return false;
            if (crStatus === 'taken') return false;
            if (crStatus === 'checking') return false;
            return true;
        }
        if (step === 3) {
            if (form.data.contacts.length === 0) return false;
            for (const c of form.data.contacts) {
                if (!c.name.trim()) return false;
            }
            const hasPrimary = form.data.contacts.some((c) => c.is_primary);
            if (!hasPrimary) return false;
            return true;
        }
        if (step === 4 || step === 5) return true;
        return true;
    }

    function handleNext() {
        if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }

    function toggleCategory(id: number) {
        const next = form.data.category_ids.includes(id)
            ? form.data.category_ids.filter((c) => c !== id)
            : [...form.data.category_ids, id];
        form.setData('category_ids', next);
    }

    function setContactPrimary(index: number) {
        const updated = form.data.contacts.map((c, i) => ({
            ...c,
            is_primary: i === index,
        }));
        form.setData('contacts', updated);
    }

    function addContact() {
        form.setData('contacts', [...form.data.contacts, { ...emptyContact, is_primary: false }]);
    }

    function removeContact(index: number) {
        const next = form.data.contacts.filter((_, i) => i !== index);
        if (next.length > 0 && form.data.contacts[index].is_primary) {
            next[0].is_primary = true;
        }
        form.setData('contacts', next);
    }

    return (
        <GuestSupplierLayout title="Supplier Registration">
            <Head title="Supplier Registration" />
            <WizardProgress currentStep={currentStep} steps={STEPS} />

            {/* Step 1 — Company Info + Categories */}
            {currentStep === 1 && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>Basic company details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_en">Legal name (EN) *</Label>
                                <Input
                                    id="legal_name_en"
                                    value={form.data.legal_name_en}
                                    onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_ar">Legal name (AR)</Label>
                                <Input
                                    id="legal_name_ar"
                                    value={form.data.legal_name_ar}
                                    onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                    dir="rtl"
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
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                >
                                    <option value="supplier">Supplier</option>
                                    <option value="subcontractor">Subcontractor</option>
                                    <option value="service_provider">Service Provider</option>
                                    <option value="consultant">Consultant</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
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
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={form.data.website}
                                    onChange={(e) => form.setData('website', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Location</CardTitle>
                            <CardDescription>Address and region.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country *</Label>
                                    <Input
                                        id="country"
                                        value={form.data.country}
                                        onChange={(e) => form.setData('country', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        value={form.data.city}
                                        onChange={(e) => form.setData('city', e.target.value)}
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
                                    className="flex w-full rounded-md border border-input px-3 py-2 text-sm"
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Categories — What do you supply?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {categories.map((cat) => (
                                    <label
                                        key={cat.id}
                                        className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
                                    >
                                        <Checkbox
                                            checked={form.data.category_ids.includes(cat.id)}
                                            onCheckedChange={() => toggleCategory(cat.id)}
                                        />
                                        <span className="text-sm">{cat.name}</span>
                                        {cat.name_ar && (
                                            <span className="text-muted-foreground text-xs" dir="rtl">
                                                {cat.name_ar}
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 2 — Legal & Compliance */}
            {currentStep === 2 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        Please provide your official legal registration details.
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Legal & Compliance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="commercial_registration_no">Commercial registration number *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="commercial_registration_no"
                                        value={form.data.commercial_registration_no}
                                        onChange={(e) => {
                                            form.setData('commercial_registration_no', e.target.value);
                                            setCrStatus('idle');
                                        }}
                                        onBlur={(e) => checkCrAvailability(e.target.value)}
                                    />
                                    {crStatus === 'checking' && (
                                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Checking...
                                        </span>
                                    )}
                                    {crStatus === 'available' && (
                                        <span className="flex items-center gap-1 text-sm text-green-600">
                                            <Check className="h-4 w-4" />
                                            Available
                                        </span>
                                    )}
                                    {crStatus === 'taken' && (
                                        <span className="flex items-center gap-1 text-sm text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            Already registered
                                        </span>
                                    )}
                                </div>
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
                                    placeholder="3XXXXXXXXXX3"
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
                                <p className="text-xs text-muted-foreground">For contractors only.</p>
                            </div>
                        </CardContent>
                    </Card>
                    {crStatus === 'taken' && (
                        <p className="text-sm text-red-600">
                            CR number is already registered. Please check and try again.
                        </p>
                    )}
                </div>
            )}

            {/* Step 3 — Contacts */}
            {currentStep === 3 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        At least one primary contact is required.
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Contacts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {form.data.contacts.map((contact, index) => (
                                <Card key={index}>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Contact {index + 1}</span>
                                            {form.data.contacts.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive"
                                                    onClick={() => removeContact(index)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Name *</Label>
                                            <Input
                                                value={contact.name}
                                                onChange={(e) => {
                                                    const next = [...form.data.contacts];
                                                    next[index] = { ...next[index], name: e.target.value };
                                                    form.setData('contacts', next);
                                                }}
                                            />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Job title</Label>
                                                <Input
                                                    value={contact.job_title}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], job_title: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Department</Label>
                                                <Input
                                                    value={contact.department}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], department: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contact type *</Label>
                                            <select
                                                value={contact.contact_type}
                                                onChange={(e) => {
                                                    const next = [...form.data.contacts];
                                                    next[index] = { ...next[index], contact_type: e.target.value };
                                                    form.setData('contacts', next);
                                                }}
                                                className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm"
                                            >
                                                <option value="sales">Sales</option>
                                                <option value="technical">Technical</option>
                                                <option value="finance">Finance</option>
                                                <option value="contracts">Contracts</option>
                                                <option value="management">Management</option>
                                            </select>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    value={contact.email}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], email: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Phone</Label>
                                                <Input
                                                    value={contact.phone}
                                                    onChange={(e) => {
                                                        const next = [...form.data.contacts];
                                                        next[index] = { ...next[index], phone: e.target.value };
                                                        form.setData('contacts', next);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mobile</Label>
                                            <Input
                                                value={contact.mobile}
                                                onChange={(e) => {
                                                    const next = [...form.data.contacts];
                                                    next[index] = { ...next[index], mobile: e.target.value };
                                                    form.setData('contacts', next);
                                                }}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`primary_${index}`}
                                                checked={contact.is_primary}
                                                onChange={() => setContactPrimary(index)}
                                            />
                                            <span className="text-sm">Set as primary contact</span>
                                        </label>
                                    </CardContent>
                                </Card>
                            ))}
                            <Button type="button" variant="outline" onClick={addContact}>
                                Add Another Contact
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 4 — Bank Details */}
            {currentStep === 4 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        Bank details are optional but required for payment processing.
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Bank Account</CardTitle>
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
                            <div className="space-y-2">
                                <Label htmlFor="iban">IBAN</Label>
                                <Input
                                    id="iban"
                                    placeholder="SA + 22 digits"
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
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Preferences</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="preferred_currency">Preferred currency</Label>
                                <select
                                    id="preferred_currency"
                                    value={form.data.preferred_currency}
                                    onChange={(e) => form.setData('preferred_currency', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm"
                                >
                                    <option value="SAR">SAR</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="AED">AED</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_terms_days">Payment terms (days)</Label>
                                <select
                                    id="payment_terms_days"
                                    value={form.data.payment_terms_days}
                                    onChange={(e) => form.setData('payment_terms_days', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm"
                                >
                                    <option value="">—</option>
                                    <option value="30">30</option>
                                    <option value="60">60</option>
                                    <option value="90">90</option>
                                    <option value="120">120</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 5 — Review & Submit */}
            {currentStep === 5 && (
                <div className="space-y-6">
                    {Object.keys(form.errors).length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {Object.entries(form.errors).map(([key, msg]) => (
                                <p key={key}>{String(msg)}</p>
                            ))}
                        </div>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p className="font-medium">{form.data.legal_name_en}</p>
                            {form.data.legal_name_ar && <p className="text-muted-foreground">{form.data.legal_name_ar}</p>}
                            {form.data.trade_name && <p>{form.data.trade_name}</p>}
                            <p>{form.data.supplier_type}</p>
                            <p>{form.data.email}</p>
                            {form.data.phone && <p>{form.data.phone}</p>}
                            <p>{form.data.country}, {form.data.city}</p>
                            {form.data.category_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {form.data.category_ids.map((id) => {
                                        const cat = categories.find((c) => c.id === id);
                                        return cat ? (
                                            <span key={id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                {cat.name}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Legal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>CR Number: {form.data.commercial_registration_no}</p>
                            {form.data.cr_expiry_date && <p>CR Expiry: {form.data.cr_expiry_date}</p>}
                            {form.data.vat_number && <p>VAT: {form.data.vat_number}</p>}
                            {form.data.unified_number && <p>Unified: {form.data.unified_number}</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Contacts ({form.data.contacts.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {form.data.contacts.map((c, i) => (
                                <p key={i} className="text-sm">
                                    {c.name} — {c.contact_type}
                                    {c.email && ` — ${c.email}`}
                                    {c.is_primary && (
                                        <span className="ml-1 rounded bg-primary/10 px-1 text-xs text-primary">Primary</span>
                                    )}
                                </p>
                            ))}
                        </CardContent>
                    </Card>
                    {(form.data.bank_name || form.data.iban) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Bank Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 text-sm">
                                {form.data.bank_name && <p>{form.data.bank_name}</p>}
                                {form.data.iban && <p>IBAN: ****{form.data.iban.slice(-4)}</p>}
                                {form.data.preferred_currency && <p>Currency: {form.data.preferred_currency}</p>}
                                {form.data.payment_terms_days && <p>Terms: {form.data.payment_terms_days} days</p>}
                            </CardContent>
                        </Card>
                    )}
                    <div className="rounded-lg border border-border p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={declared}
                                onChange={(e) => setDeclared(e.target.checked)}
                                className="mt-1"
                            />
                            <span className="text-sm">
                                I confirm that all information provided is accurate and complete. I understand that
                                false or misleading information may result in rejection of this application.
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                    disabled={currentStep === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Button>
                {currentStep < TOTAL_STEPS ? (
                    <Button type="button" onClick={handleNext}>
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        disabled={!declared || form.processing}
                        onClick={() => form.post('/register/supplier')}
                    >
                        {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Submit Registration
                    </Button>
                )}
            </div>
        </GuestSupplierLayout>
    );
}
