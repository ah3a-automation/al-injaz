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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface CreateProps {
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    packagesByProject: Record<string, Array<{ id: string; project_id: string; name_en: string; code: string }>>;
    boqItemsByProject: Record<string, Array<{ id: string; project_id: string; code: string; description_en: string }>>;
}

interface PrItem {
    description_en: string;
    description_ar: string;
    unit: string;
    qty: string;
    estimated_cost: string;
    boq_item_id: string;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
] as const;

const emptyItem = (): PrItem => ({
    description_en: '',
    description_ar: '',
    unit: '',
    qty: '',
    estimated_cost: '',
    boq_item_id: '',
});

export default function Create({ projects, packagesByProject, boqItemsByProject }: CreateProps) {
    const form = useForm({
        project_id: '',
        package_id: '',
        title_en: '',
        title_ar: '',
        description: '',
        priority: 'normal',
        needed_by_date: '',
        items: [emptyItem()] as PrItem[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            project_id: data.project_id,
            package_id: data.package_id || null,
            title_en: data.title_en,
            title_ar: data.title_ar || null,
            description: data.description || null,
            priority: data.priority,
            needed_by_date: data.needed_by_date || null,
            items: data.items.map((it) => ({
                description_en: it.description_en,
                description_ar: it.description_ar || null,
                unit: it.unit || null,
                qty: it.qty ? parseFloat(it.qty) : null,
                estimated_cost: parseFloat(it.estimated_cost) || 0,
                boq_item_id: it.boq_item_id || null,
            })),
        }));
        form.post(route('purchase-requests.store'));
    };

    const addItem = () => {
        form.setData('items', [...form.data.items, emptyItem()]);
    };

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) return;
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: keyof PrItem, value: string) => {
        const items = [...form.data.items];
        items[idx] = { ...items[idx], [field]: value };
        form.setData('items', items);
    };

    const packages = form.data.project_id ? (packagesByProject[form.data.project_id] ?? []) : [];
    const boqItems = form.data.project_id ? (boqItemsByProject[form.data.project_id] ?? []) : [];

    return (
        <AppLayout>
            <Head title="Create Purchase Request" />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Create Purchase Request</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('purchase-requests.index')}>Cancel</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request details</CardTitle>
                            <CardDescription>Add a new purchase request.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="project_id">Project *</Label>
                                    <Select
                                        value={form.data.project_id || 'none'}
                                        onValueChange={(v) => {
                                            form.setData('project_id', v === 'none' ? '' : v);
                                            form.setData('package_id', '');
                                        }}
                                    >
                                        <SelectTrigger id="project_id" aria-label="Project">
                                            <SelectValue placeholder="Select project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select project</SelectItem>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name_en ?? p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.project_id && (
                                        <p className="text-sm text-destructive">{form.errors.project_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="package_id">Package</Label>
                                    <Select
                                        value={form.data.package_id || 'none'}
                                        onValueChange={(v) => form.setData('package_id', v === 'none' ? '' : v)}
                                        disabled={!form.data.project_id}
                                    >
                                        <SelectTrigger id="package_id" aria-label="Package">
                                            <SelectValue placeholder="Select package" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {packages.map((pkg) => (
                                                <SelectItem key={pkg.id} value={pkg.id}>
                                                    {pkg.code} — {pkg.name_en}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.package_id && (
                                        <p className="text-sm text-destructive">{form.errors.package_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title_en">Title EN *</Label>
                                    <Input
                                        id="title_en"
                                        value={form.data.title_en}
                                        onChange={(e) => form.setData('title_en', e.target.value)}
                                        required
                                        maxLength={300}
                                        aria-invalid={!!form.errors.title_en}
                                    />
                                    {form.errors.title_en && (
                                        <p className="text-sm text-destructive">{form.errors.title_en}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title_ar">Title AR</Label>
                                    <Input
                                        id="title_ar"
                                        value={form.data.title_ar}
                                        onChange={(e) => form.setData('title_ar', e.target.value)}
                                        maxLength={300}
                                        aria-invalid={!!form.errors.title_ar}
                                    />
                                    {form.errors.title_ar && (
                                        <p className="text-sm text-destructive">{form.errors.title_ar}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-invalid={!!form.errors.description}
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-destructive">{form.errors.description}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={form.data.priority}
                                        onValueChange={(v) => form.setData('priority', v)}
                                    >
                                        <SelectTrigger id="priority" aria-label="Priority">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITY_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.priority && (
                                        <p className="text-sm text-destructive">{form.errors.priority}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="needed_by_date">Needed By Date</Label>
                                    <Input
                                        id="needed_by_date"
                                        type="date"
                                        value={form.data.needed_by_date}
                                        onChange={(e) => form.setData('needed_by_date', e.target.value)}
                                        aria-invalid={!!form.errors.needed_by_date}
                                    />
                                    {form.errors.needed_by_date && (
                                        <p className="text-sm text-destructive">{form.errors.needed_by_date}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Items</CardTitle>
                                    <CardDescription>Add at least one item to the purchase request.</CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {form.errors.items && (
                                <p className="text-sm text-destructive mb-4">{form.errors.items}</p>
                            )}
                            <div className="space-y-4">
                                {form.data.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-12"
                                    >
                                        <div className="sm:col-span-11 space-y-3">
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Description EN *</Label>
                                                    <Input
                                                        value={item.description_en}
                                                        onChange={(e) => updateItem(idx, 'description_en', e.target.value)}
                                                        placeholder="Description (EN)"
                                                        required
                                                        aria-invalid={!!form.errors[`items.${idx}.description_en`]}
                                                    />
                                                    {form.errors[`items.${idx}.description_en`] && (
                                                        <p className="text-sm text-destructive">
                                                            {form.errors[`items.${idx}.description_en`]}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description AR</Label>
                                                    <Input
                                                        value={item.description_ar}
                                                        onChange={(e) => updateItem(idx, 'description_ar', e.target.value)}
                                                        placeholder="Description (AR)"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-4">
                                                <div className="space-y-2">
                                                    <Label>Unit</Label>
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                        placeholder="e.g. EA"
                                                        maxLength={50}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.0001"
                                                        min="0"
                                                        value={item.qty}
                                                        onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Estimated Cost *</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.estimated_cost}
                                                        onChange={(e) => updateItem(idx, 'estimated_cost', e.target.value)}
                                                        placeholder="0"
                                                        required
                                                        aria-invalid={!!form.errors[`items.${idx}.estimated_cost`]}
                                                    />
                                                    {form.errors[`items.${idx}.estimated_cost`] && (
                                                        <p className="text-sm text-destructive">
                                                            {form.errors[`items.${idx}.estimated_cost`]}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>BOQ Item</Label>
                                                    <Select
                                                        value={item.boq_item_id || 'none'}
                                                        onValueChange={(v) => updateItem(idx, 'boq_item_id', v === 'none' ? '' : v)}
                                                        disabled={!form.data.project_id}
                                                    >
                                                        <SelectTrigger aria-label="BOQ Item">
                                                            <SelectValue placeholder="Optional" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {boqItems.map((boq) => (
                                                                <SelectItem key={boq.id} value={boq.id}>
                                                                    {boq.code} — {boq.description_en}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-1 flex items-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(idx)}
                                                disabled={form.data.items.length <= 1}
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Create Purchase Request
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('purchase-requests.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
