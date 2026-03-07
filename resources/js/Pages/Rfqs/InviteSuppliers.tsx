import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SupplierRow {
    id: string;
    legal_name_en: string;
    supplier_code: string;
    supplier_type: string;
    city: string | null;
    country: string | null;
    classification_grade: string | null;
}

interface InvitedSupplier {
    id: string;
    status: string;
    supplier: { id: string; legal_name_en: string; supplier_code: string };
}

interface InviteSuppliersProps {
    rfq: { id: string; rfq_number: string; title: string; status: string };
    suppliers: {
        data: SupplierRow[];
        current_page: number;
        last_page: number;
    };
    invited: InvitedSupplier[];
    filters: {
        search?: string;
        supplier_type?: string;
        city?: string;
        country?: string;
        classification_grade?: string;
    };
}

const supplierStatusBadgeClass: Record<string, string> = {
    invited: 'bg-slate-100 text-slate-700',
    accepted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    submitted: 'bg-green-100 text-green-700',
};

export default function InviteSuppliers({ rfq, suppliers, invited, filters }: InviteSuppliersProps) {
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchInput(filters.search ?? '');
    }, [filters.search]);

    const applyFilters = useCallback(
        (overrides: Record<string, string | undefined>) => {
            const params: Record<string, string> = {
                search: filters.search ?? '',
                supplier_type: filters.supplier_type ?? '',
                city: filters.city ?? '',
                country: filters.country ?? '',
                classification_grade: filters.classification_grade ?? '',
            };
            for (const [k, v] of Object.entries(overrides)) {
                params[k] = v ?? '';
            }
            const normalized = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== '')
            ) as Record<string, string>;
            router.get(route('rfqs.invite-suppliers', rfq.id), normalized, {
                preserveState: true,
                replace: true,
            });
        },
        [filters, rfq.id]
    );

    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: searchInput });
            debounceRef.current = null;
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput, applyFilters]);

    const invitedIds = new Set(invited.map((i) => i.supplier.id));

    const handleInvite = (supplierId: string) => {
        router.post(route('rfqs.suppliers.invite', rfq.id), {
            supplier_ids: [supplierId],
        }, { preserveScroll: true });
    };

    const handleRemove = (rsId: string) => {
        router.delete(route('rfqs.suppliers.remove', [rfq.id, rsId]), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title={`Invite Suppliers — ${rfq.rfq_number}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('rfqs.index')} className="hover:text-foreground">
                        RFQs
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={route('rfqs.show', rfq.id)} className="hover:text-foreground">
                        {rfq.rfq_number}
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground">Invite Suppliers</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Suppliers</CardTitle>
                            <CardDescription>Find and invite suppliers to this RFQ</CardDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Input
                                    placeholder="Search by name or code"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="max-w-[200px]"
                                />
                                <Select
                                    value={filters.supplier_type || 'all'}
                                    onValueChange={(v) => applyFilters({ supplier_type: v === 'all' ? undefined : v })}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        <SelectItem value="supplier">Supplier</SelectItem>
                                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                        <SelectItem value="service_provider">Service Provider</SelectItem>
                                        <SelectItem value="consultant">Consultant</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="City"
                                    value={filters.city ?? ''}
                                    onChange={(e) => applyFilters({ city: e.target.value || undefined })}
                                    className="max-w-[120px]"
                                />
                                <Input
                                    placeholder="Country"
                                    value={filters.country ?? ''}
                                    onChange={(e) => applyFilters({ country: e.target.value || undefined })}
                                    className="max-w-[120px]"
                                />
                                <Input
                                    placeholder="Grade"
                                    value={filters.classification_grade ?? ''}
                                    onChange={(e) => applyFilters({ classification_grade: e.target.value || undefined })}
                                    className="max-w-[100px]"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">City</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suppliers.data.map((s) => (
                                            <tr key={s.id} className="border-b border-border">
                                                <td className="px-4 py-3 text-sm">{s.supplier_code}</td>
                                                <td className="px-4 py-3 text-sm">{s.legal_name_en}</td>
                                                <td className="px-4 py-3 text-sm">{s.supplier_type}</td>
                                                <td className="px-4 py-3 text-sm">{s.city ?? '—'}</td>
                                                <td className="px-4 py-3 text-sm">{s.country ?? '—'}</td>
                                                <td className="px-4 py-3 text-sm">{s.classification_grade ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {invitedIds.has(s.id) ? (
                                                        <Badge variant="outline" className="bg-slate-100">
                                                            Already Invited
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleInvite(s.id)}
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                            Invite
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {suppliers.last_page > 1 && (
                                <div className="flex justify-center gap-2 p-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={suppliers.current_page <= 1}
                                        onClick={() =>
                                            router.get(route('rfqs.invite-suppliers', rfq.id), {
                                                ...filters,
                                                page: suppliers.current_page - 1,
                                            })
                                        }
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={suppliers.current_page >= suppliers.last_page}
                                        onClick={() =>
                                            router.get(route('rfqs.invite-suppliers', rfq.id), {
                                                ...filters,
                                                page: suppliers.current_page + 1,
                                            })
                                        }
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Invited Suppliers ({invited.length})</CardTitle>
                            <CardDescription>Suppliers invited to this RFQ</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invited.map((rs) => (
                                            <tr key={rs.id} className="border-b border-border">
                                                <td className="px-4 py-3 text-sm">{rs.supplier.supplier_code}</td>
                                                <td className="px-4 py-3 text-sm">{rs.supplier.legal_name_en}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={supplierStatusBadgeClass[rs.status] ?? ''}>
                                                        {rs.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {rs.status !== 'submitted' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemove(rs.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Remove
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {invited.length === 0 && (
                                <p className="p-6 text-center text-muted-foreground">No suppliers invited yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
