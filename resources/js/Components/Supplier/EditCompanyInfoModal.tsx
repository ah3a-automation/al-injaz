import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

interface EditCompanyInfoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: {
        legal_name_en: string;
        legal_name_ar: string | null;
        trade_name: string | null;
        supplier_type: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        country: string | null;
        website: string | null;
        commercial_registration_no: string | null;
        vat_number: string | null;
        bank_name: string | null;
        bank_account_name: string | null;
        iban: string | null;
        swift_code: string | null;
        preferred_currency: string | null;
        payment_terms_days: number | null;
        categories?: Array<{ id: number }>;
    };
    locations: Record<string, string[]>;
    categories: Array<{ id: number; name: string; name_ar: string | null; slug: string }>;
}

export default function EditCompanyInfoModal({
    open,
    onOpenChange,
    supplier,
    locations,
    categories,
}: EditCompanyInfoModalProps) {
    const form = useForm({
        legal_name_en: supplier.legal_name_en ?? '',
        legal_name_ar: supplier.legal_name_ar ?? '',
        trade_name: supplier.trade_name ?? '',
        supplier_type: supplier.supplier_type ?? 'supplier',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        postal_code: supplier.postal_code ?? '',
        country: supplier.country ?? '',
        website: supplier.website ?? '',
        commercial_registration_no: supplier.commercial_registration_no ?? '',
        vat_number: supplier.vat_number ?? '',
        bank_name: supplier.bank_name ?? '',
        bank_account_name: supplier.bank_account_name ?? '',
        iban: supplier.iban ?? '',
        swift_code: supplier.swift_code ?? '',
        preferred_currency: supplier.preferred_currency ?? 'SAR',
        payment_terms_days: supplier.payment_terms_days ?? '',
        category_ids: (supplier.categories ?? []).map((c) => c.id),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(route('supplier.profile.update'), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const countries = Object.keys(locations);
    const cities = form.data.country ? (locations[form.data.country] ?? []) : [];

    return (
        <Transition show={open}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={() => onOpenChange(false)}
            >
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40" />
                </TransitionChild>
                <div className="fixed inset-0 overflow-y-auto p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <TransitionChild
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-xl">
                                <form onSubmit={handleSubmit}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                        <CardTitle>Edit Company Information</CardTitle>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                                            Close
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="max-h-[70vh] space-y-6 overflow-y-auto">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_legal_name_en">Legal name (EN) *</Label>
                                                <Input
                                                    id="modal_legal_name_en"
                                                    value={form.data.legal_name_en}
                                                    onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                                />
                                                {form.errors.legal_name_en && <p className="text-sm text-destructive">{form.errors.legal_name_en}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_legal_name_ar">Legal name (AR)</Label>
                                                <Input id="modal_legal_name_ar" value={form.data.legal_name_ar} onChange={(e) => form.setData('legal_name_ar', e.target.value)} dir="rtl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal_trade_name">Trade name</Label>
                                            <Input id="modal_trade_name" value={form.data.trade_name} onChange={(e) => form.setData('trade_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <select
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
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_email">Company email</Label>
                                                <Input id="modal_email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_phone">Phone</Label>
                                                <Input id="modal_phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal_website">Website</Label>
                                            <Input id="modal_website" type="url" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />
                                            {form.errors.website && <p className="text-sm text-destructive">{form.errors.website}</p>}
                                        </div>
                                        <hr />
                                        <div className="space-y-2">
                                            <Label htmlFor="modal_country">Country</Label>
                                            <select
                                                id="modal_country"
                                                value={form.data.country}
                                                onChange={(e) => {
                                                    form.setData('country', e.target.value);
                                                    form.setData('city', '');
                                                }}
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                            >
                                                <option value="">Select country</option>
                                                {countries.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal_city">City</Label>
                                            <select
                                                id="modal_city"
                                                value={form.data.city}
                                                onChange={(e) => form.setData('city', e.target.value)}
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                disabled={!form.data.country}
                                            >
                                                <option value="">Select city</option>
                                                {cities.map((city) => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_postal_code">Postal code</Label>
                                                <Input id="modal_postal_code" value={form.data.postal_code} onChange={(e) => form.setData('postal_code', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_address">Address</Label>
                                                <Input id="modal_address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                                            </div>
                                        </div>
                                        <hr />
                                        <div className="space-y-2">
                                            <Label>Categories</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {categories.map((cat) => (
                                                    <label key={cat.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.data.category_ids.includes(cat.id)}
                                                            onChange={(e) =>
                                                                form.setData(
                                                                    'category_ids',
                                                                    e.target.checked ? [...form.data.category_ids, cat.id] : form.data.category_ids.filter((id) => id !== cat.id)
                                                                )
                                                            }
                                                        />
                                                        {cat.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <hr />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_cr">Commercial registration no.</Label>
                                                <Input id="modal_cr" value={form.data.commercial_registration_no} onChange={(e) => form.setData('commercial_registration_no', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_vat">VAT number</Label>
                                                <Input id="modal_vat" value={form.data.vat_number} onChange={(e) => form.setData('vat_number', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_bank_name">Bank name</Label>
                                                <Input id="modal_bank_name" value={form.data.bank_name} onChange={(e) => form.setData('bank_name', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_bank_account_name">Account holder</Label>
                                                <Input id="modal_bank_account_name" value={form.data.bank_account_name} onChange={(e) => form.setData('bank_account_name', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_iban">IBAN</Label>
                                                <Input id="modal_iban" value={form.data.iban} onChange={(e) => form.setData('iban', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_swift">SWIFT</Label>
                                                <Input id="modal_swift" value={form.data.swift_code} onChange={(e) => form.setData('swift_code', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_currency">Preferred currency</Label>
                                                <select
                                                    id="modal_currency"
                                                    value={form.data.preferred_currency}
                                                    onChange={(e) => form.setData('preferred_currency', e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                >
                                                    <option value="SAR">SAR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                    <option value="AED">AED</option>
                                                    <option value="GBP">GBP</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal_payment_terms">Payment terms (days)</Label>
                                                <select
                                                    id="modal_payment_terms"
                                                    value={form.data.payment_terms_days === '' || form.data.payment_terms_days === null ? '' : String(form.data.payment_terms_days)}
                                                    onChange={(e) => form.setData('payment_terms_days', e.target.value ? Number(e.target.value) : '')}
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                >
                                                    <option value="">—</option>
                                                    <option value="30">30</option>
                                                    <option value="60">60</option>
                                                    <option value="90">90</option>
                                                    <option value="120">120</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="flex justify-end gap-2 border-t p-4">
                                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.processing}>
                                            {form.processing ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
