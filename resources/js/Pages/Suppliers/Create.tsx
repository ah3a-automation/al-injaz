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
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

interface CreateProps {
    categories: Array<{ id: number; name: string; name_ar: string | null }>;
}

export default function Create({ categories }: CreateProps) {
    const form = useForm({
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
        notes: '',
        category_ids: [] as number[],
    });

    const toggleCategory = (id: number) => {
        const next = form.data.category_ids.includes(id)
            ? form.data.category_ids.filter((c) => c !== id)
            : [...form.data.category_ids, id];
        form.setData('category_ids', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('suppliers.store'));
    };

    return (
        <AppLayout>
            <Head title="Create Supplier" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Create Supplier</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('suppliers.index')}>Cancel</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Info</CardTitle>
                            <CardDescription>Legal and trade names.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_en">Legal name (EN) *</Label>
                                <Input
                                    id="legal_name_en"
                                    value={form.data.legal_name_en}
                                    onChange={(e) => form.setData('legal_name_en', e.target.value)}
                                    required
                                    aria-invalid={!!form.errors.legal_name_en}
                                />
                                {form.errors.legal_name_en && (
                                    <p className="text-sm text-destructive">{form.errors.legal_name_en}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_name_ar">Legal name (AR)</Label>
                                <Input
                                    id="legal_name_ar"
                                    value={form.data.legal_name_ar ?? ''}
                                    onChange={(e) => form.setData('legal_name_ar', e.target.value)}
                                    aria-invalid={!!form.errors.legal_name_ar}
                                />
                                {form.errors.legal_name_ar && (
                                    <p className="text-sm text-destructive">{form.errors.legal_name_ar}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="trade_name">Trade name</Label>
                                <Input
                                    id="trade_name"
                                    value={form.data.trade_name ?? ''}
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
                                        required
                                        aria-invalid={!!form.errors.country}
                                    />
                                    {form.errors.country && (
                                        <p className="text-sm text-destructive">{form.errors.country}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        value={form.data.city}
                                        onChange={(e) => form.setData('city', e.target.value)}
                                        required
                                        aria-invalid={!!form.errors.city}
                                    />
                                    {form.errors.city && (
                                        <p className="text-sm text-destructive">{form.errors.city}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postal_code">Postal code</Label>
                                <Input
                                    id="postal_code"
                                    value={form.data.postal_code ?? ''}
                                    onChange={(e) => form.setData('postal_code', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <textarea
                                    id="address"
                                    value={form.data.address ?? ''}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    rows={2}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Info</CardTitle>
                            <CardDescription>Phone, email, website.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone ?? ''}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    aria-invalid={!!form.errors.phone}
                                />
                                {form.errors.phone && (
                                    <p className="text-sm text-destructive">{form.errors.phone}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email ?? ''}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    aria-invalid={!!form.errors.email}
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
                                    value={form.data.website ?? ''}
                                    onChange={(e) => form.setData('website', e.target.value)}
                                    aria-invalid={!!form.errors.website}
                                />
                                {form.errors.website && (
                                    <p className="text-sm text-destructive">{form.errors.website}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Categories</CardTitle>
                            <CardDescription>Select one or more categories (3 columns).</CardDescription>
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
                            {form.errors.category_ids && (
                                <p className="mt-2 text-sm text-destructive">{form.errors.category_ids}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                            <CardDescription>Optional notes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                id="notes"
                                value={form.data.notes ?? ''}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Create supplier
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('suppliers.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
