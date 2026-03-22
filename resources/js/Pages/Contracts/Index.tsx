import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, Link, router } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface ContractRow {
    id: string;
    contract_number: string;
    contract_value: string;
    currency: string;
    status: string;
    created_at: string;
    variations_count: number;
    invoices_count: number;
    source_type?: string;
    rfq?: {
        id: string;
        rfq_number: string;
        title: string | null;
        project?: { id: string; name: string; name_en: string | null } | null;
    } | null;
    supplier?: {
        id: string;
        legal_name_en: string;
        supplier_code: string | null;
    } | null;
    template?: {
        id: string;
        code: string;
        name_en: string;
    } | null;
}

interface CursorPayload {
    data: ContractRow[];
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
}

interface Props {
    contracts: CursorPayload;
    metrics: {
        total: number;
        draft: number;
        active: number;
        completed: number;
    };
    filters: {
        status?: string;
        search?: string;
    };
    statuses: string[];
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    under_preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ready_for_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_legal_review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_commercial_review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    in_management_review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    returned_for_rework: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    approved_for_signature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    signature_package_issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    awaiting_internal_signature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    awaiting_supplier_signature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    partially_signed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    fully_signed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    pending_signature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const defaultStatusBadgeClass =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

function contractStatusLabel(status: string, t: (key: string) => string): string {
    const fullKey = `contract_list_status.${status}`;
    const translated = t(fullKey);
    if (translated === fullKey || translated.startsWith('contract_list_status.')) {
        return status.replace(/_/g, ' ');
    }

    return translated;
}

export default function ContractsIndex({ contracts, metrics, filters, statuses }: Props) {
    const { t } = useLocale('contracts');
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
    }, [filters.search]);

    const applyFilters = useCallback(
        (overrides: Record<string, string | number | undefined>) => {
            const params: Record<string, string | number> = {
                search: filters.search ?? '',
                status: filters.status ?? '',
                per_page: contracts.per_page,
            };

            Object.assign(params, overrides);

            const normalized = Object.fromEntries(
                Object.entries(params).filter(([, value]) => value !== '' && value !== undefined)
            ) as Record<string, string | number>;

            router.get(route('contracts.index'), normalized, { preserveState: true, preserveScroll: true, replace: true });
        },
        [contracts.per_page, filters.search, filters.status]
    );

    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            applyFilters({ search: searchInput });
            debounceRef.current = null;
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [applyFilters, searchInput]);

    return (
        <AppLayout>
            <Head title="Contracts" />
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold tabular-nums">{metrics.total}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold tabular-nums">{metrics.draft}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold tabular-nums">{metrics.active}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-semibold tabular-nums">{metrics.completed}</p></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Contract List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search contract, RFQ, supplier..."
                                className="h-9 w-[320px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                            />
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(value) => applyFilters({ status: value === 'all' ? undefined : value })}
                            >
                                <SelectTrigger className="h-9 w-[220px]">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {statuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {contractStatusLabel(status, t)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/80">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-medium">Contract</th>
                                        <th className="px-4 py-3 text-left font-medium">RFQ</th>
                                        <th className="px-4 py-3 text-left font-medium">Supplier</th>
                                        <th className="px-4 py-3 text-left font-medium">Template</th>
                                        <th className="px-4 py-3 text-right font-medium">Value</th>
                                        <th className="px-4 py-3 text-center font-medium">Variations</th>
                                        <th className="px-4 py-3 text-center font-medium">Invoices</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contracts.data.map((row) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">{row.contract_number}</td>
                                            <td className="px-4 py-3">
                                                {row.rfq ? (
                                                    <Link href={route('rfqs.show', row.rfq.id)} className="hover:underline">
                                                        {row.rfq.rfq_number}
                                                    </Link>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{row.supplier?.legal_name_en ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                {row.template ? `${row.template.code} — ${row.template.name_en}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {row.currency} {parseFloat(row.contract_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">{row.variations_count}</td>
                                            <td className="px-4 py-3 text-center tabular-nums">{row.invoices_count}</td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        statusBadgeClass[row.status] ?? defaultStatusBadgeClass
                                                    }
                                                >
                                                    {contractStatusLabel(row.status, t)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('contracts.show', row.id)} aria-label="View Contract">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {contracts.data.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No contracts found.</div>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Showing {contracts.data.length} contracts</p>
                            <div className="flex gap-2">
                                {contracts.prev_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: contracts.prev_cursor! })}
                                    >
                                        Previous
                                    </Button>
                                )}
                                {contracts.next_cursor && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilters({ cursor: contracts.next_cursor! })}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
