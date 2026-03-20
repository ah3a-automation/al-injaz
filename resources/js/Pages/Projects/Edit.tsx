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
import type { Project, ProjectStatus } from '@/types/projects';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP'];
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'on_hold', label: 'On hold' },
] as const;

interface EditProps {
    project: Project;
}

function formatDateValue(value: string | null | undefined): string {
    if (!value) return '';
    return value.slice(0, 10);
}

export default function Edit({ project }: EditProps) {
    const form = useForm({
        code: project.code ?? '',
        name_en: project.name_en ?? project.name ?? '',
        name_ar: project.name_ar ?? '',
        name: project.name ?? '',
        description: project.description ?? '',
        client: project.client ?? '',
        currency: project.currency ?? 'SAR',
        contract_value: project.contract_value != null ? String(project.contract_value) : '',
        planned_margin_pct: project.planned_margin_pct != null ? String(project.planned_margin_pct) : '',
        min_margin_pct: project.min_margin_pct != null ? String(project.min_margin_pct) : '',
        status: project.status,
        start_date: formatDateValue(project.start_date),
        end_date: formatDateValue(project.end_date),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            name: data.name_en || data.name_ar || data.code,
            code: data.code || null,
            name_en: data.name_en || null,
            name_ar: data.name_ar || null,
            description: data.description || null,
            client: data.client || null,
            currency: data.currency || null,
            contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
            planned_margin_pct: data.planned_margin_pct ? parseFloat(data.planned_margin_pct) : null,
            min_margin_pct: data.min_margin_pct ? parseFloat(data.min_margin_pct) : null,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
            status: data.status,
        }));
        form.patch(route('projects.update', project.id));
    };

    return (
        <AppLayout>
            <Head title={`Edit ${project.name}`} />

            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Edit Project
                    </h1>

                    <Button variant="outline" asChild>
                        <Link href={route('projects.show', project.id)}>
                            Cancel
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Project details</CardTitle>
                        <CardDescription>
                            Update project information.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Project Code</Label>
                                <Input
                                    id="code"
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value)}
                                    placeholder="e.g. PRJ-001"
                                    maxLength={50}
                                    aria-invalid={!!form.errors.code}
                                />
                                {form.errors.code && (
                                    <p className="text-sm text-destructive">{form.errors.code}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name_en">Name EN</Label>
                                    <Input
                                        id="name_en"
                                        value={form.data.name_en}
                                        onChange={(e) => form.setData('name_en', e.target.value)}
                                        required
                                        maxLength={200}
                                        aria-invalid={!!form.errors.name_en}
                                    />
                                    {form.errors.name_en && (
                                        <p className="text-sm text-destructive">{form.errors.name_en}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name_ar">Name AR</Label>
                                    <Input
                                        id="name_ar"
                                        value={form.data.name_ar}
                                        onChange={(e) => form.setData('name_ar', e.target.value)}
                                        maxLength={200}
                                        aria-invalid={!!form.errors.name_ar}
                                    />
                                    {form.errors.name_ar && (
                                        <p className="text-sm text-destructive">{form.errors.name_ar}</p>
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

                            <div className="space-y-2">
                                <Label htmlFor="client">Client</Label>
                                <Input
                                    id="client"
                                    value={form.data.client}
                                    onChange={(e) => form.setData('client', e.target.value)}
                                    aria-invalid={!!form.errors.client}
                                />
                                {form.errors.client && (
                                    <p className="text-sm text-destructive">{form.errors.client}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select
                                        value={form.data.currency}
                                        onValueChange={(v) => form.setData('currency', v)}
                                    >
                                        <SelectTrigger id="currency" aria-label="Currency">
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
                                <div className="space-y-2">
                                    <Label htmlFor="contract_value">Contract Value</Label>
                                    <Input
                                        id="contract_value"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.data.contract_value}
                                        onChange={(e) => form.setData('contract_value', e.target.value)}
                                        aria-invalid={!!form.errors.contract_value}
                                    />
                                    {form.errors.contract_value && (
                                        <p className="text-sm text-destructive">{form.errors.contract_value}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="planned_margin_pct">Planned Margin %</Label>
                                    <Input
                                        id="planned_margin_pct"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={form.data.planned_margin_pct}
                                        onChange={(e) => form.setData('planned_margin_pct', e.target.value)}
                                        aria-invalid={!!form.errors.planned_margin_pct}
                                    />
                                    {form.errors.planned_margin_pct && (
                                        <p className="text-sm text-destructive">{form.errors.planned_margin_pct}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="min_margin_pct">Minimum Margin %</Label>
                                    <Input
                                        id="min_margin_pct"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={form.data.min_margin_pct}
                                        onChange={(e) => form.setData('min_margin_pct', e.target.value)}
                                        aria-invalid={!!form.errors.min_margin_pct}
                                    />
                                    {form.errors.min_margin_pct && (
                                        <p className="text-sm text-destructive">{form.errors.min_margin_pct}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Start date</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={form.data.start_date}
                                        onChange={(e) => form.setData('start_date', e.target.value)}
                                        aria-invalid={!!form.errors.start_date}
                                    />
                                    {form.errors.start_date && (
                                        <p className="text-sm text-destructive">{form.errors.start_date}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">End date</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={form.data.end_date}
                                        onChange={(e) => form.setData('end_date', e.target.value)}
                                        aria-invalid={!!form.errors.end_date}
                                    />
                                    {form.errors.end_date && (
                                        <p className="text-sm text-destructive">{form.errors.end_date}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(v) => form.setData('status', v as ProjectStatus)}
                                >
                                    <SelectTrigger id="status" aria-label="Status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.status && (
                                    <p className="text-sm text-destructive">{form.errors.status}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={form.processing}>
                                    Save changes
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('projects.show', project.id)}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
