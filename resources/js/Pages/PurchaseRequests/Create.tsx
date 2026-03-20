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
import { useLocale } from '@/hooks/useLocale';

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
    { value: 'low', labelKey: 'priority_low' },
    { value: 'normal', labelKey: 'priority_normal' },
    { value: 'high', labelKey: 'priority_high' },
    { value: 'urgent', labelKey: 'priority_urgent' },
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
    const { t } = useLocale();
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
            <Head title={t('title_create', 'purchase_requests')} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title_create', 'purchase_requests')}</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('purchase-requests.index')}>{t('action_cancel', 'purchase_requests')}</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('request_details', 'purchase_requests')}</CardTitle>
                            <CardDescription>{t('request_details_desc', 'purchase_requests')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="project_id">{t('field_project', 'purchase_requests')} *</Label>
                                    <Select
                                        value={form.data.project_id || 'none'}
                                        onValueChange={(v) => {
                                            form.setData('project_id', v === 'none' ? '' : v);
                                            form.setData('package_id', '');
                                        }}
                                    >
                                        <SelectTrigger id="project_id" aria-label={t('field_project', 'purchase_requests')}>
                                            <SelectValue placeholder={t('select_project', 'purchase_requests')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('select_project', 'purchase_requests')}</SelectItem>
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
                                    <Label htmlFor="package_id">{t('field_package', 'purchase_requests')}</Label>
                                    <Select
                                        value={form.data.package_id || 'none'}
                                        onValueChange={(v) => form.setData('package_id', v === 'none' ? '' : v)}
                                        disabled={!form.data.project_id}
                                    >
                                        <SelectTrigger id="package_id" aria-label={t('field_package', 'purchase_requests')}>
                                            <SelectValue placeholder={t('select_package', 'purchase_requests')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('select_package_none', 'purchase_requests')}</SelectItem>
                                            {packages.map((pkg) => (
                                                <SelectItem key={pkg.id} value={pkg.id}>
                                                    <span dir="ltr" className="font-mono">{pkg.code}</span>
                                                    {' — '}
                                                    {pkg.name_en}
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
                                    <Label htmlFor="title_en">{t('field_title_en', 'purchase_requests')} *</Label>
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
                                    <Label htmlFor="title_ar">{t('field_title_ar', 'purchase_requests')}</Label>
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
                                <Label htmlFor="description">{t('field_description', 'purchase_requests')}</Label>
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
                                    <Label htmlFor="priority">{t('field_priority', 'purchase_requests')}</Label>
                                    <Select
                                        value={form.data.priority}
                                        onValueChange={(v) => form.setData('priority', v)}
                                    >
                                        <SelectTrigger id="priority" aria-label={t('field_priority', 'purchase_requests')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITY_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {t(opt.labelKey, 'purchase_requests')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.priority && (
                                        <p className="text-sm text-destructive">{form.errors.priority}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="needed_by_date">{t('field_needed_by_date', 'purchase_requests')}</Label>
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
                                    <CardTitle>{t('items_card_title', 'purchase_requests')}</CardTitle>
                                    <CardDescription>{t('items_card_desc', 'purchase_requests')}</CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="h-4 w-4" />
                                    {t('add_item', 'purchase_requests')}
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
                                                    <Label>{t('field_description_en', 'purchase_requests')} *</Label>
                                                    <Input
                                                        value={item.description_en}
                                                        onChange={(e) => updateItem(idx, 'description_en', e.target.value)}
                                                        placeholder={t('field_description_en', 'purchase_requests')}
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
                                                    <Label>{t('field_description_ar', 'purchase_requests')}</Label>
                                                    <Input
                                                        value={item.description_ar}
                                                        onChange={(e) => updateItem(idx, 'description_ar', e.target.value)}
                                                        placeholder={t('field_description_ar', 'purchase_requests')}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-4">
                                                <div className="space-y-2">
                                                    <Label>{t('field_unit', 'purchase_requests')}</Label>
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                        placeholder="e.g. EA"
                                                        maxLength={50}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('field_qty', 'purchase_requests')}</Label>
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
                                                    <Label>{t('field_estimated_cost', 'purchase_requests')} *</Label>
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
                                                    <Label>{t('field_boq_item', 'purchase_requests')}</Label>
                                                    <Select
                                                        value={item.boq_item_id || 'none'}
                                                        onValueChange={(v) => updateItem(idx, 'boq_item_id', v === 'none' ? '' : v)}
                                                        disabled={!form.data.project_id}
                                                    >
                                                        <SelectTrigger aria-label={t('field_boq_item', 'purchase_requests')}>
                                                            <SelectValue placeholder={t('optional', 'purchase_requests')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">{t('select_package_none', 'purchase_requests')}</SelectItem>
                                                            {boqItems.map((boq) => (
                                                                <SelectItem key={boq.id} value={boq.id}>
                                                                    <span dir="ltr" className="font-mono">{boq.code}</span>
                                                                    {' — '}
                                                                    {boq.description_en}
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
                                                aria-label={t('remove_item', 'purchase_requests')}
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
                            {t('title_create', 'purchase_requests')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('purchase-requests.index')}>{t('action_cancel', 'purchase_requests')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
