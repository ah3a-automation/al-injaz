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
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface PrItem {
    id: string;
    description_en: string;
    description_ar?: string | null;
    estimated_cost?: number | string;
}

interface PurchaseRequest {
    id: string;
    pr_number: string;
    title_en: string;
    project_id: string | null;
    items: PrItem[];
}

interface CreateProps {
    projects: Array<{ id: string; name: string; name_en: string | null }>;
    purchaseRequests: PurchaseRequest[];
    boqItemsByProject: Record<string, Array<{ id: string; project_id: string; code: string; description_en: string }>>;
}

interface RfqItem {
    code: string;
    description_en: string;
    description_ar: string;
    unit: string;
    qty: string;
    estimated_cost: string;
    boq_item_id: string;
    pr_item_id: string;
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP'];

const emptyItem = (): RfqItem => ({
    code: '',
    description_en: '',
    description_ar: '',
    unit: '',
    qty: '',
    estimated_cost: '',
    boq_item_id: '',
    pr_item_id: '',
});

export default function Create({ projects, purchaseRequests, boqItemsByProject }: CreateProps) {
    const { t } = useLocale();

    const form = useForm({
        project_id: '',
        purchase_request_id: '',
        title: '',
        description: '',
        submission_deadline: '',
        validity_period_days: '',
        currency: 'SAR',
        require_acceptance: true,
        items: [emptyItem()] as RfqItem[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            project_id: data.project_id || null,
            purchase_request_id: data.purchase_request_id || null,
            title: data.title,
            description: data.description || null,
            submission_deadline: data.submission_deadline || null,
            validity_period_days: data.validity_period_days ? parseInt(data.validity_period_days, 10) : null,
            currency: data.currency,
            require_acceptance: data.require_acceptance,
            items: data.items.map((it, i) => ({
                code: it.code || null,
                description_en: it.description_en,
                description_ar: it.description_ar || null,
                unit: it.unit || null,
                qty: it.qty ? parseFloat(it.qty) : null,
                estimated_cost: parseFloat(it.estimated_cost) || 0,
                boq_item_id: it.boq_item_id || null,
                pr_item_id: it.pr_item_id || null,
                sort_order: i,
            })),
        }));
        form.post(route('rfqs.store'));
    };

    const addItem = () => {
        form.setData('items', [...form.data.items, emptyItem()]);
    };

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) return;
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: keyof RfqItem, value: string | boolean) => {
        const items = [...form.data.items];
        items[idx] = { ...items[idx], [field]: value };
        form.setData('items', items);
    };

    const selectedPr = purchaseRequests.find((pr) => pr.id === form.data.purchase_request_id);
    const prItems = selectedPr?.items ?? [];
    const boqItems = form.data.project_id ? (boqItemsByProject[form.data.project_id] ?? []) : [];

    const handlePrSelect = (prId: string) => {
        form.setData('purchase_request_id', prId || '');
        if (prId) {
            const pr = purchaseRequests.find((p) => p.id === prId);
            if (pr?.items?.length) {
                form.setData('items', pr.items.map((it) => ({
                    code: '',
                    description_en: it.description_en,
                    description_ar: it.description_ar ?? '',
                    unit: '',
                    qty: '',
                    estimated_cost: String(it.estimated_cost ?? 0),
                    boq_item_id: '',
                    pr_item_id: it.id,
                })));
            }
        }
    };

    return (
        <AppLayout>
            <Head title={t('title_create', 'rfqs')} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_create', 'rfqs')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('rfqs.index')}>
                            {t('action_cancel', 'rfqs')}
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('section_basic', 'rfqs')}</CardTitle>
                            <CardDescription>
                                {t('field_description', 'rfqs')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    {t('field_title', 'rfqs')} *
                                </Label>
                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    required
                                    maxLength={300}
                                    aria-invalid={!!form.errors.title}
                                />
                                {form.errors.title && (
                                    <p className="text-sm text-destructive">{form.errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    {t('field_description', 'rfqs')}
                                </Label>
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
                                    <Label htmlFor="project_id">
                                        {t('field_project', 'rfqs')}
                                    </Label>
                                    <Select
                                        value={form.data.project_id || 'none'}
                                        onValueChange={(v) => form.setData('project_id', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger
                                            id="project_id"
                                            aria-label={t('field_project', 'rfqs')}
                                        >
                                            <SelectValue
                                                placeholder={t('all_projects', 'rfqs')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {t('none', 'admin')}
                                            </SelectItem>
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
                                    <Label htmlFor="purchase_request_id">
                                        {t('field_boq', 'rfqs')}
                                    </Label>
                                    <Select
                                        value={form.data.purchase_request_id || 'none'}
                                        onValueChange={handlePrSelect}
                                    >
                                        <SelectTrigger
                                            id="purchase_request_id"
                                            aria-label={t('field_boq', 'rfqs')}
                                        >
                                            <SelectValue placeholder={t('field_boq', 'rfqs')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {t('none', 'admin')}
                                            </SelectItem>
                                            {purchaseRequests.map((pr) => (
                                                <SelectItem key={pr.id} value={pr.id}>
                                                    {pr.pr_number} — {pr.title_en}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.purchase_request_id && (
                                        <p className="text-sm text-destructive">{form.errors.purchase_request_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="submission_deadline">
                                        {t('field_deadline', 'rfqs')}
                                    </Label>
                                    <Input
                                        id="submission_deadline"
                                        type="date"
                                        value={form.data.submission_deadline}
                                        onChange={(e) => form.setData('submission_deadline', e.target.value)}
                                        min={new Date().toISOString().slice(0, 10)}
                                        aria-invalid={!!form.errors.submission_deadline}
                                    />
                                    {form.errors.submission_deadline && (
                                        <p className="text-sm text-destructive">{form.errors.submission_deadline}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="validity_period_days">
                                        {t('validity_period_days', 'rfqs')}
                                    </Label>
                                    <Input
                                        id="validity_period_days"
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={form.data.validity_period_days}
                                        onChange={(e) => form.setData('validity_period_days', e.target.value)}
                                        placeholder="e.g. 30"
                                        aria-invalid={!!form.errors.validity_period_days}
                                    />
                                    {form.errors.validity_period_days && (
                                        <p className="text-sm text-destructive">{form.errors.validity_period_days}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">
                                        {t('field_currency', 'rfqs')}
                                    </Label>
                                    <Select
                                        value={form.data.currency}
                                        onValueChange={(v) => form.setData('currency', v)}
                                    >
                                        <SelectTrigger
                                            id="currency"
                                            aria-label={t('field_currency', 'rfqs')}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.currency && (
                                        <p className="text-sm text-destructive">{form.errors.currency}</p>
                                    )}
                                </div>
                                <div className="flex items-end pb-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="require_acceptance"
                                            checked={form.data.require_acceptance}
                                            onCheckedChange={(checked) =>
                                                form.setData('require_acceptance', checked === true)
                                            }
                                            aria-label={t('require_acceptance', 'rfqs')}
                                        />
                                        <Label
                                            htmlFor="require_acceptance"
                                            className="cursor-pointer"
                                        >
                                            {t('require_acceptance', 'rfqs')}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{t('section_boq', 'rfqs')}</CardTitle>
                                    <CardDescription>
                                        {t('boq_description', 'rfqs')}
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="h-4 w-4" />
                                    {t('action_add', 'admin')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {form.errors.items && (
                                <p className="mb-4 text-sm text-destructive">
                                    {form.errors.items}
                                </p>
                            )}
                            <div className="space-y-4">
                                {form.data.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-12"
                                    >
                                        <div className="sm:col-span-11 space-y-3">
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="space-y-2">
                                                    <Label>
                                                        {t('boq_item', 'rfqs')}
                                                    </Label>
                                                    <Input
                                                        value={item.code}
                                                        onChange={(e) => updateItem(idx, 'code', e.target.value)}
                                                        placeholder="Item code"
                                                        maxLength={100}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>
                                                        {t('boq_description', 'rfqs')} EN *
                                                    </Label>
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
                                                    <Label>{t('boq_description', 'rfqs')} AR</Label>
                                                    <Input
                                                        value={item.description_ar}
                                                        onChange={(e) => updateItem(idx, 'description_ar', e.target.value)}
                                                        placeholder="Description (AR)"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-5">
                                                <div className="space-y-2">
                                                    <Label>{t('boq_unit', 'rfqs')}</Label>
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                        placeholder="e.g. EA"
                                                        maxLength={50}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('boq_quantity', 'rfqs')}</Label>
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
                                                    <Label>
                                                        {t('field_budget', 'rfqs')} *
                                                    </Label>
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
                                                    <Label>{t('boq_item', 'rfqs')}</Label>
                                                    <Select
                                                        value={item.boq_item_id || 'none'}
                                                        onValueChange={(v) => {
                                                            updateItem(idx, 'boq_item_id', v === 'none' ? '' : v);
                                                            if (v !== 'none') updateItem(idx, 'pr_item_id', '');
                                                        }}
                                                        disabled={!form.data.project_id}
                                                    >
                                                        <SelectTrigger
                                                            aria-label={t('boq_item', 'rfqs')}
                                                        >
                                                            <SelectValue
                                                                placeholder={t(
                                                                    'boq_item',
                                                                    'rfqs'
                                                                )}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                {t('none', 'admin')}
                                                            </SelectItem>
                                                            {boqItems.map((boq) => (
                                                                <SelectItem key={boq.id} value={boq.id}>
                                                                    <span
                                                                        dir="ltr"
                                                                        className="font-mono tabular-nums"
                                                                    >
                                                                        {boq.code}
                                                                    </span>{' '}
                                                                    — {boq.description_en}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {form.errors[`items.${idx}.boq_item_id`] && (
                                                        <p className="text-sm text-destructive">
                                                            {form.errors[`items.${idx}.boq_item_id`]}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('field_boq', 'rfqs')}</Label>
                                                    <Select
                                                        value={item.pr_item_id || 'none'}
                                                        onValueChange={(v) => {
                                                            updateItem(idx, 'pr_item_id', v === 'none' ? '' : v);
                                                            if (v !== 'none') updateItem(idx, 'boq_item_id', '');
                                                        }}
                                                        disabled={!form.data.purchase_request_id}
                                                    >
                                                        <SelectTrigger
                                                            aria-label={t('field_boq', 'rfqs')}
                                                        >
                                                            <SelectValue
                                                                placeholder={t(
                                                                    'field_boq',
                                                                    'rfqs'
                                                                )}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                {t('none', 'admin')}
                                                            </SelectItem>
                                                            {prItems.map((pi) => (
                                                                <SelectItem key={pi.id} value={pi.id}>
                                                                    {pi.description_en}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {form.errors[`items.${idx}.pr_item_id`] && (
                                                        <p className="text-sm text-destructive">
                                                            {form.errors[`items.${idx}.pr_item_id`]}
                                                        </p>
                                                    )}
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
                                                aria-label={t('action_delete', 'rfqs')}
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
                            {t('action_create', 'rfqs')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('rfqs.index')}>
                                {t('action_cancel', 'rfqs')}
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
