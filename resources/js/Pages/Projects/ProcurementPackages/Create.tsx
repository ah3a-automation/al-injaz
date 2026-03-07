import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Plus, Trash2, Columns3, X, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';

interface ProjectInfo {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    code?: string | null;
}

interface BoqItemOption {
    id: string;
    code: string;
    description_en: string | null;
    unit: string | null;
    qty: string | null;
    revenue_amount: string;
    planned_cost: string;
    lead_type?: string | null;
    package_usage_count: number;
    request_usage_count: number;
    actual_cost_sum: number;
}

interface CursorPaginatedBoqItems {
    data: BoqItemOption[];
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    path?: string;
}

interface CreateProps {
    project: ProjectInfo;
    boqItems: CursorPaginatedBoqItems;
    units: string[];
    filters: {
        search?: string | null;
        unit?: string | null;
        lead_type?: string | null;
        unused_only?: boolean;
        quick_filter?: QuickFilter;
    };
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP'];
const DOCUMENT_TYPES = [
    { value: 'specifications', label: 'Specifications' },
    { value: 'drawings', label: 'Drawings' },
    { value: 'boq', label: 'BOQ' },
    { value: 'other', label: 'Other' },
];
const SOURCE_TYPES = [
    { value: 'upload', label: 'Upload' },
    { value: 'google_drive', label: 'Google Drive' },
    { value: 'dropbox', label: 'Dropbox' },
    { value: 'onedrive', label: 'OneDrive' },
    { value: 'wetransfer', label: 'WeTransfer' },
    { value: 'other_link', label: 'Other link' },
];
const ROW_HEIGHT_COMFORTABLE = 64;
const ROW_HEIGHT_COMPACT = 44;
const DEBOUNCE_MS = 300;

type QuickFilter = 'high_margin' | 'low_margin' | 'unused' | 'high_cost' | null;
type DensityMode = 'comfortable' | 'compact';
type FilterOverrides = {
    cursor?: string | null;
    search?: string;
    unit?: string;
    lead_type?: string;
    unused_only?: boolean;
    quick_filter?: QuickFilter;
};

function estProfitPct(revenue: number, cost: number): number | null {
    if (revenue <= 0) return null;
    return ((revenue - cost) / revenue) * 100;
}

function formatCurrency(value: string | number | null | undefined): string {
    if (value == null || value === '') return '0';
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function formatPercent(value: string | number | null | undefined): string {
    if (value == null || value === '') return '0%';
    return `${Number(value).toFixed(1)}%`;
}

function profitPctColorClass(pct: number | null): string {
    if (pct == null) return 'text-muted-foreground';
    if (pct < 5) return 'profit-low';
    if (pct <= 10) return 'profit-medium';
    return 'profit-good';
}

type RiskId = 'missing_cost' | 'low_profit' | 'high_unit_price' | 'never_used';
interface RowRisk {
    id: RiskId;
    message: string;
    colorClass: string;
}
function getRisksForRow(item: BoqItemOption): RowRisk[] {
    const risks: RowRisk[] = [];
    const cost = parseFloat(item.planned_cost ?? '');
    const rev = parseFloat(item.revenue_amount ?? '0');
    const qtyNum = parseFloat(item.qty ?? '0') || 0;
    const unitPrice = qtyNum > 0 ? rev / qtyNum : null;
    const pct = estProfitPct(rev, cost);

    if (cost === 0 || item.planned_cost === null || item.planned_cost === '' || Number.isNaN(cost)) {
        risks.push({ id: 'missing_cost', message: 'Missing Estimated Cost', colorClass: 'text-orange-600' });
    }
    if (pct !== null && pct < 5) {
        risks.push({ id: 'low_profit', message: 'Profit < 5%', colorClass: 'text-red-600' });
    }
    if (unitPrice !== null && cost > 0 && unitPrice > cost * 2) {
        risks.push({ id: 'high_unit_price', message: 'High Unit Price', colorClass: 'text-yellow-600' });
    }
    if ((item.package_usage_count ?? 0) === 0) {
        risks.push({ id: 'never_used', message: 'Never used in packages', colorClass: 'text-gray-500' });
    }
    return risks;
}

function normalizeDescription(desc: string | null | undefined): string {
    if (desc == null) return '';
    return String(desc).toLowerCase().trim().replace(/\s+/g, ' ');
}

type AnomalyId = 'duplicate' | 'extreme_unit_price' | 'extreme_qty' | 'cost_exceeds_revenue';
interface RowAnomaly {
    id: AnomalyId;
    message: string;
}
function getAnomaliesForRow(item: BoqItemOption, pageData: BoqItemOption[]): RowAnomaly[] {
    const anomalies: RowAnomaly[] = [];
    const rev = parseFloat(item.revenue_amount ?? '0');
    const cost = parseFloat(item.planned_cost ?? '0');
    const qtyNum = parseFloat(item.qty ?? '0') || 0;
    const unitPrice = qtyNum > 0 ? rev / qtyNum : null;

    const normDesc = normalizeDescription(item.description_en ?? '');
    if (normDesc !== '') {
        const duplicateCount = pageData.filter((other) => normalizeDescription(other.description_en ?? '') === normDesc).length;
        if (duplicateCount > 1) {
            anomalies.push({ id: 'duplicate', message: 'Duplicate BOQ item' });
        }
    }

    const unitPrices = pageData
        .map((i) => {
            const q = parseFloat(i.qty ?? '0') || 0;
            return q > 0 ? parseFloat(i.revenue_amount ?? '0') / q : null;
        })
        .filter((u): u is number => u !== null && Number.isFinite(u));
    const avgUnitPrice = unitPrices.length > 0 ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length : 0;
    if (unitPrice !== null && avgUnitPrice > 0 && unitPrice > avgUnitPrice * 3) {
        anomalies.push({ id: 'extreme_unit_price', message: 'Extremely high unit price' });
    }

    if (qtyNum < 0.1 || qtyNum > 10000) {
        anomalies.push({ id: 'extreme_qty', message: 'Unusual quantity' });
    }

    if (cost > rev) {
        anomalies.push({ id: 'cost_exceeds_revenue', message: 'Cost exceeds revenue' });
    }

    return anomalies;
}

interface DescriptionCellProps {
    descriptionText: string;
    itemCode: string;
    isExpanded: boolean;
    className?: string;
    onToggle: () => void;
}

function DescriptionCell({
    descriptionText,
    itemCode,
    isExpanded,
    className,
    onToggle,
}: DescriptionCellProps) {
    const textRef = useRef<HTMLParagraphElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const measureOverflow = useCallback(() => {
        const element = textRef.current;
        if (!element) return;
        const overflowing = element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
        setIsOverflowing(overflowing);
    }, []);

    useLayoutEffect(() => {
        measureOverflow();
    }, [measureOverflow, descriptionText, isExpanded]);

    useEffect(() => {
        const element = textRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            measureOverflow();
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [measureOverflow, descriptionText, isExpanded]);

    const showToggle = descriptionText !== '—' && (isExpanded || isOverflowing);

    return (
        <div className={`min-w-0 overflow-hidden flex items-start gap-2 py-1 text-left ${className ?? ''}`}>
            <p
                ref={textRef}
                className={`min-w-0 max-w-full flex-1 leading-snug ${isExpanded ? 'break-words whitespace-normal' : 'overflow-hidden whitespace-nowrap'}`}
                title={!isExpanded ? descriptionText : undefined}
            >
                {descriptionText}
            </p>
            {showToggle && (
                <button
                    type="button"
                    className="shrink-0 rounded px-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={isExpanded ? `Collapse description for ${itemCode}` : `Expand description for ${itemCode}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    ...
                </button>
            )}
        </div>
    );
}

type ColumnKey = 'unit' | 'qty' | 'revenue' | 'estCost' | 'unitPrice' | 'unitCost' | 'profitPercent' | 'pkgUse' | 'rfqUse' | 'actualCost';
const BOQ_COLUMN_KEYS: ColumnKey[] = ['unit', 'qty', 'revenue', 'estCost', 'unitPrice', 'unitCost', 'profitPercent', 'pkgUse', 'rfqUse', 'actualCost'];
const BOQ_COLUMN_WIDTHS: Record<ColumnKey, string> = {
    unit: '72px',
    qty: '64px',
    revenue: 'minmax(140px, 140px)',
    estCost: 'minmax(120px, 120px)',
    unitPrice: 'minmax(120px, 120px)',
    unitCost: 'minmax(120px, 120px)',
    profitPercent: 'minmax(100px, 100px)',
    pkgUse: '56px',
    rfqUse: '56px',
    actualCost: '90px',
};
const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
    unit: true,
    qty: true,
    revenue: true,
    estCost: true,
    unitPrice: true,
    unitCost: true,
    profitPercent: true,
    pkgUse: true,
    rfqUse: true,
    actualCost: true,
};
function buildGridColumns(visible: Record<ColumnKey, boolean>): string {
    const parts = ['80px', '80px', '48px', '110px', '1fr'];
    BOQ_COLUMN_KEYS.forEach((k) => {
        if (visible[k]) parts.push(BOQ_COLUMN_WIDTHS[k]);
    });
    return parts.join(' ');
}

function buildCreateUrl(projectId: string, params: { search?: string; unit?: string; lead_type?: string; unused_only?: boolean; quick_filter?: QuickFilter; cursor?: string | null }): string {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.unit) searchParams.set('unit', params.unit);
    if (params.lead_type) searchParams.set('lead_type', params.lead_type);
    if (params.unused_only) searchParams.set('unused_only', '1');
    if (params.quick_filter) searchParams.set('quick_filter', params.quick_filter);
    if (params.cursor) searchParams.set('cursor', params.cursor);
    const qs = searchParams.toString();
    return route('projects.procurement-packages.create', projectId) + (qs ? `?${qs}` : '');
}

export default function ProcurementPackagesCreate({ project, boqItems, units, filters }: CreateProps) {
    const projectName = project.name_en ?? project.name ?? 'Project';

    const form = useForm({
        name: '',
        description: '',
        currency: 'SAR',
        needed_by_date: '',
        boq_item_ids: [] as string[],
        attachments: [] as { document_type: string; title: string; source_type: string; external_url: string; external_provider: string; file?: File | null }[],
    });

    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
    const [selectedItemsData, setSelectedItemsData] = useState<Map<string, { revenue_amount: string; planned_cost: string }>>(() => new Map());

    const [filterSearch, setFilterSearch] = useState(filters.search ?? '');
    const [filterUnit, setFilterUnit] = useState(filters.unit ?? '');
    const [filterLeadType, setFilterLeadType] = useState(filters.lead_type ?? '');
    const [filterUnusedOnly, setFilterUnusedOnly] = useState(filters.unused_only ?? false);

    useEffect(() => {
        setFilterSearch(filters.search ?? '');
        setFilterUnit(filters.unit ?? '');
        setFilterLeadType(filters.lead_type ?? '');
        setFilterUnusedOnly(filters.unused_only ?? false);
    }, [filters.search, filters.unit, filters.lead_type, filters.unused_only]);

    const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
        try {
            const saved = localStorage.getItem('boq-selector-columns');
            if (saved) {
                const parsed = JSON.parse(saved) as Record<string, boolean>;
                return { ...DEFAULT_VISIBLE_COLUMNS, ...parsed };
            }
        } catch {
            /* ignore */
        }
        return { ...DEFAULT_VISIBLE_COLUMNS };
    });
    useEffect(() => {
        try {
            localStorage.setItem('boq-selector-columns', JSON.stringify(visibleColumns));
        } catch {
            /* ignore */
        }
    }, [visibleColumns]);

    const [freezeColumns, setFreezeColumns] = useState<boolean>(() => {
        try {
            const v = localStorage.getItem('boq-selector-freeze-columns');
            return v !== 'false';
        } catch {
            return true;
        }
    });
    const quickFilter = filters.quick_filter ?? null;
    const [expandedDescriptionRows, setExpandedDescriptionRows] = useState<Set<string>>(() => new Set());

    const [density, setDensity] = useState<DensityMode>('comfortable');

    useEffect(() => {
        try {
            localStorage.setItem('boq-selector-freeze-columns', String(freezeColumns));
        } catch {
            /* ignore */
        }
    }, [freezeColumns]);

    const rowHeight = density === 'compact' ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_COMFORTABLE;

    const insights = useMemo(() => {
        const data = boqItems.data;
        const highMargin = data.filter((item) => {
            const pct = estProfitPct(parseFloat(item.revenue_amount ?? '0'), parseFloat(item.planned_cost ?? '0'));
            return pct !== null && pct > 20;
        }).length;
        const lowMargin = data.filter((item) => {
            const pct = estProfitPct(parseFloat(item.revenue_amount ?? '0'), parseFloat(item.planned_cost ?? '0'));
            return pct !== null && pct < 5;
        }).length;
        const highCost = data.filter((item) => parseFloat(item.planned_cost ?? '0') > 10000).length;
        const unused = data.filter((item) => (item.package_usage_count ?? 0) === 0).length;
        return { highMargin, lowMargin, highCost, unused };
    }, [boqItems.data]);

    const hasActiveFilters = Boolean(
        quickFilter || (filterSearch && filterSearch.trim()) || filterUnit || filterLeadType || filterUnusedOnly
    );

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const gridColumns = useMemo(() => buildGridColumns(visibleColumns), [visibleColumns]);

    const applyFiltersToUrl = useCallback(
        (overrides?: FilterOverrides) => {
            const hasOverride = (key: keyof FilterOverrides): boolean => !!overrides && key in overrides;

            const search = hasOverride('search') ? overrides?.search : filterSearch;
            const unit = hasOverride('unit') ? overrides?.unit : filterUnit;
            const leadType = hasOverride('lead_type') ? overrides?.lead_type : filterLeadType;
            const unusedOnly = hasOverride('unused_only') ? overrides?.unused_only : filterUnusedOnly;
            const qf = hasOverride('quick_filter') ? overrides?.quick_filter : quickFilter;
            const cursor = hasOverride('cursor') ? overrides?.cursor : undefined;
            router.get(buildCreateUrl(project.id, {
                search: search || undefined,
                unit: unit || undefined,
                lead_type: leadType || undefined,
                unused_only: unusedOnly,
                quick_filter: qf ?? undefined,
                cursor: cursor ?? undefined,
            }), {}, { preserveState: true, preserveScroll: true, replace: true });
        },
        [project.id, filterSearch, filterUnit, filterLeadType, filterUnusedOnly, quickFilter]
    );

    const clearAllFilters = useCallback(() => {
        setFilterSearch('');
        setFilterUnit('');
        setFilterLeadType('');
        setFilterUnusedOnly(false);
        applyFiltersToUrl({
            search: undefined,
            unit: undefined,
            lead_type: undefined,
            unused_only: undefined,
            quick_filter: undefined,
            cursor: undefined,
        });
    }, [applyFiltersToUrl]);

    const isFirstSearchRef = useRef(true);
    useEffect(() => {
        if (isFirstSearchRef.current) {
            isFirstSearchRef.current = false;
            return;
        }
        const t = setTimeout(() => {
            router.get(buildCreateUrl(project.id, {
                search: filterSearch || undefined,
                unit: filterUnit || undefined,
                lead_type: filterLeadType || undefined,
                unused_only: filterUnusedOnly,
                quick_filter: quickFilter ?? undefined,
            }), {}, { preserveState: true, preserveScroll: true, replace: true });
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [filterSearch]);

    useEffect(() => {
        setSelectedItemsData((prev) => {
            const next = new Map(prev);
            for (const item of boqItems.data) {
                if (selectedItemIds.has(item.id)) {
                    next.set(item.id, { revenue_amount: item.revenue_amount ?? '0', planned_cost: item.planned_cost ?? '0' });
                }
            }
            return next;
        });
    }, [boqItems.data, selectedItemIds]);

    const summaryFromData = useMemo(() => {
        let revenue = 0;
        let cost = 0;
        selectedItemsData.forEach((v) => {
            revenue += parseFloat(v.revenue_amount ?? '0');
            cost += parseFloat(v.planned_cost ?? '0');
        });
        const profit = revenue - cost;
        const profitPct = revenue > 0 ? (profit / revenue) * 100 : null;
        return { count: selectedItemsData.size, revenue, cost, profit, profitPct };
    }, [selectedItemsData]);

    const toggleItem = useCallback((id: string, item?: BoqItemOption) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                setSelectedItemsData((d) => {
                    const m = new Map(d);
                    m.delete(id);
                    return m;
                });
            } else {
                next.add(id);
                if (item) {
                    setSelectedItemsData((d) => new Map(d).set(id, { revenue_amount: item.revenue_amount ?? '0', planned_cost: item.planned_cost ?? '0' }));
                }
            }
            return next;
        });
    }, []);

    const toggleDescriptionExpanded = useCallback((id: string) => {
        setExpandedDescriptionRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const selectAllOnPage = useCallback(() => {
        const pageItems = boqItems.data;
        const pageIds = pageItems.map((i) => i.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedItemIds.has(id));
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach((id) => next.delete(id));
                setSelectedItemsData((d) => {
                    const m = new Map(d);
                    pageIds.forEach((id) => m.delete(id));
                    return m;
                });
            } else {
                pageIds.forEach((id) => next.add(id));
                setSelectedItemsData((d) => {
                    const m = new Map(d);
                    pageItems.forEach((item) => m.set(item.id, { revenue_amount: item.revenue_amount ?? '0', planned_cost: item.planned_cost ?? '0' }));
                    return m;
                });
            }
            return next;
        });
    }, [boqItems.data, selectedItemIds]);

    useEffect(() => {
        form.setData('boq_item_ids', Array.from(selectedItemIds));
    }, [selectedItemIds]);

    useEffect(() => {
        // Keep expansion state scoped to currently visible page rows.
        setExpandedDescriptionRows((prev) => {
            if (prev.size === 0) return prev;
            const visibleIds = new Set(boqItems.data.map((item) => item.id));
            const next = new Set<string>();
            prev.forEach((id) => {
                if (visibleIds.has(id)) next.add(id);
            });
            return next.size === prev.size ? prev : next;
        });
    }, [boqItems.data]);

    const rowVirtualizer = useVirtualizer({
        count: boqItems.data.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => rowHeight,
        measureElement: (el) => el.getBoundingClientRect().height,
        overscan: 10,
    });

    useLayoutEffect(() => {
        rowVirtualizer.measure();
    }, [expandedDescriptionRows, rowHeight, rowVirtualizer]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    function handleUnitChange(value: string) {
        setFilterUnit(value === '_' ? '' : value);
        router.get(buildCreateUrl(project.id, {
            search: filterSearch || undefined,
            unit: value === '_' ? undefined : value,
            lead_type: filterLeadType || undefined,
            unused_only: filterUnusedOnly,
            quick_filter: quickFilter ?? undefined,
        }), {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function handleLeadTypeChange(value: string) {
        setFilterLeadType(value === '_' ? '' : value);
        router.get(buildCreateUrl(project.id, {
            search: filterSearch || undefined,
            unit: filterUnit || undefined,
            lead_type: value === '_' ? undefined : value,
            unused_only: filterUnusedOnly,
            quick_filter: quickFilter ?? undefined,
        }), {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function handleUnusedOnlyChange(checked: boolean) {
        setFilterUnusedOnly(checked);
        router.get(buildCreateUrl(project.id, {
            search: filterSearch || undefined,
            unit: filterUnit || undefined,
            lead_type: filterLeadType || undefined,
            unused_only: checked,
            quick_filter: quickFilter ?? undefined,
        }), {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function addAttachment() {
        form.setData('attachments', [
            ...form.data.attachments,
            { document_type: 'other', title: '', source_type: 'other_link', external_url: '', external_provider: '', file: null },
        ]);
    }

    function removeAttachment(i: number) {
        form.setData('attachments', form.data.attachments.filter((_, idx) => idx !== i));
    }

    return (
        <AppLayout>
            <Head title={`New procurement package - ${projectName}`} />
            <div className="space-y-6">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('projects.index')} className="hover:text-foreground">
                        Projects
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.show', project.id)} className="hover:text-foreground">
                        {projectName}
                    </Link>
                    <span>/</span>
                    <Link href={route('projects.procurement-packages.index', project.id)} className="hover:text-foreground">
                        Procurement packages
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">New package</span>
                </nav>

                <h1 className="text-2xl font-semibold tracking-tight">New procurement package</h1>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const boqIds = Array.from(selectedItemIds);
                        const attachmentsToSend = form.data.attachments.filter((a) => (a.title ?? '').trim() !== '');
                        const hasFile = attachmentsToSend.some((a) => a.source_type === 'upload' && a.file);
                        if (hasFile) {
                            const fd = new FormData();
                            fd.append('name', form.data.name);
                            fd.append('description', form.data.description);
                            fd.append('currency', form.data.currency);
                            fd.append('needed_by_date', form.data.needed_by_date);
                            boqIds.forEach((id) => fd.append('boq_item_ids[]', id));
                            attachmentsToSend.forEach((att, i) => {
                                fd.append(`attachments[${i}][document_type]`, att.document_type || 'other');
                                fd.append(`attachments[${i}][title]`, att.title);
                                fd.append(`attachments[${i}][source_type]`, att.source_type);
                                fd.append(`attachments[${i}][external_url]`, att.external_url || '');
                                fd.append(`attachments[${i}][external_provider]`, att.external_provider || '');
                                if (att.source_type === 'upload' && att.file) {
                                    fd.append(`attachments[${i}][file]`, att.file);
                                }
                            });
                            router.post(route('projects.procurement-packages.store', project.id), fd, {
                                forceFormData: true,
                                preserveScroll: false,
                            });
                        } else {
                            form.setData('boq_item_ids', boqIds);
                            form.setData('attachments', attachmentsToSend.map(({ file: _f, ...rest }) => rest));
                            form.post(route('projects.procurement-packages.store', project.id), { preserveScroll: false });
                        }
                    }}
                    className="space-y-6"
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                            <CardDescription>Name, currency, and required-by date</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                    />
                                    {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency *</Label>
                                    <Select value={form.data.currency} onValueChange={(v) => form.setData('currency', v)}>
                                        <SelectTrigger id="currency">
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
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="needed_by_date">Needed by date</Label>
                                <Input
                                    id="needed_by_date"
                                    type="date"
                                    value={form.data.needed_by_date}
                                    onChange={(e) => form.setData('needed_by_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>BOQ items</CardTitle>
                            <CardDescription>
                                Search and filter (live). Select items to include. Indexed search and cursor pagination (50 per page).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium text-muted-foreground">Search (code / description)</Label>
                                    <Input
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-[320px]"
                                        aria-label="Search BOQ items"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                                    <Select value={filterUnit || '_'} onValueChange={handleUnitChange}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">All</SelectItem>
                                            {units.map((u) => (
                                                <SelectItem key={u} value={u}>
                                                    {u}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium text-muted-foreground">Lead type</Label>
                                    <Select value={filterLeadType || '_'} onValueChange={handleLeadTypeChange}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">All</SelectItem>
                                            <SelectItem value="short">Short</SelectItem>
                                            <SelectItem value="long">Long</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <Checkbox
                                        id="unused_only"
                                        checked={filterUnusedOnly}
                                        onCheckedChange={(c) => handleUnusedOnlyChange(!!c)}
                                    />
                                    <Label htmlFor="unused_only" className="cursor-pointer text-sm">
                                        Only unused items
                                    </Label>
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
                                    {quickFilter && (
                                        <button
                                            type="button"
                                            onClick={() => applyFiltersToUrl({ quick_filter: undefined, cursor: undefined })}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            {quickFilter === 'high_margin' ? 'High Margin' : quickFilter === 'low_margin' ? 'Low Margin' : quickFilter === 'unused' ? 'Unused Items' : 'High Cost'}
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    {filterSearch?.trim() && (
                                        <button
                                            type="button"
                                            onClick={() => { setFilterSearch(''); applyFiltersToUrl({ search: undefined, cursor: undefined }); }}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            Search: {filterSearch.trim()}
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    {filterUnit && (
                                        <button
                                            type="button"
                                            onClick={() => applyFiltersToUrl({ unit: undefined, cursor: undefined })}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            Unit = {filterUnit}
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    {filterLeadType && (
                                        <button
                                            type="button"
                                            onClick={() => applyFiltersToUrl({ lead_type: undefined, cursor: undefined })}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            Lead = {filterLeadType}
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    {filterUnusedOnly && (
                                        <button
                                            type="button"
                                            onClick={() => applyFiltersToUrl({ unused_only: undefined, cursor: undefined })}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            Unused only
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
                                        Clear all
                                    </Button>
                                </div>
                            )}

                            <div className="rounded-lg border border-border bg-muted/20 p-4">
                                <h3 className="mb-3 text-sm font-semibold text-foreground">Procurement Insights</h3>
                                <p className="mb-3 text-xs text-muted-foreground">Counts from current page. Click a card to filter the full dataset.</p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <button
                                        type="button"
                                        onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'high_margin' ? undefined : 'high_margin', cursor: undefined })}
                                        className={`flex flex-col rounded-md border p-3 text-left transition-colors ${quickFilter === 'high_margin' ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                                    >
                                        <span className={`text-xs font-medium ${quickFilter === 'high_margin' ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>High Margin</span>
                                        <span className="text-2xl font-semibold tabular-nums">{insights.highMargin}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'low_margin' ? undefined : 'low_margin', cursor: undefined })}
                                        className={`flex flex-col rounded-md border p-3 text-left transition-colors ${quickFilter === 'low_margin' ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                                    >
                                        <span className={`text-xs font-medium ${quickFilter === 'low_margin' ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>Low Margin</span>
                                        <span className="text-2xl font-semibold tabular-nums">{insights.lowMargin}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'high_cost' ? undefined : 'high_cost', cursor: undefined })}
                                        className={`flex flex-col rounded-md border p-3 text-left transition-colors ${quickFilter === 'high_cost' ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                                    >
                                        <span className={`text-xs font-medium ${quickFilter === 'high_cost' ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>High Cost</span>
                                        <span className="text-2xl font-semibold tabular-nums">{insights.highCost}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'unused' ? undefined : 'unused', cursor: undefined })}
                                        className={`flex flex-col rounded-md border p-3 text-left transition-colors ${quickFilter === 'unused' ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                                    >
                                        <span className={`text-xs font-medium ${quickFilter === 'unused' ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>Unused BOQ Items</span>
                                        <span className="text-2xl font-semibold tabular-nums">{insights.unused}</span>
                                    </button>
                                </div>
                            </div>

                            {boqItems.data.length === 0 ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                    {quickFilter
                                        ? 'No BOQ items match the quick filter and other filters. Try &quot;Reset&quot; or clear filters.'
                                        : 'No BOQ items match the filters. Import and activate a BOQ, or clear filters.'}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <Checkbox
                                                id="select-all-page"
                                                checked={boqItems.data.length > 0 && boqItems.data.every((i) => selectedItemIds.has(i.id))}
                                                onCheckedChange={selectAllOnPage}
                                            />
                                            <Label htmlFor="select-all-page" className="cursor-pointer text-sm font-medium">
                                                Select all on this page ({boqItems.data.length} items)
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="freeze-columns"
                                                    checked={freezeColumns}
                                                    onCheckedChange={(c) => setFreezeColumns(c === true)}
                                                />
                                                <Label htmlFor="freeze-columns" className="cursor-pointer text-sm">
                                                    Freeze key columns
                                                </Label>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" aria-label="Toggle columns">
                                                        <Columns3 className="h-4 w-4" />
                                                        Columns
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-48">
                                                    {BOQ_COLUMN_KEYS.map((key) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={key}
                                                            checked={visibleColumns[key]}
                                                            onCheckedChange={(checked) =>
                                                                setVisibleColumns((prev) => ({ ...prev, [key]: checked === true }))
                                                            }
                                                        >
                                                            {key === 'estCost' ? 'Est. cost' : key === 'unitPrice' ? 'Unit price' : key === 'unitCost' ? 'Unit cost' : key === 'profitPercent' ? 'Profit %' : key === 'pkgUse' ? 'Pkg use' : key === 'rfqUse' ? 'RFQ use' : key === 'actualCost' ? 'Actual cost' : key.charAt(0).toUpperCase() + key.slice(1)}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-muted-foreground">Quick:</span>
                                                <Button type="button" variant={quickFilter === 'high_margin' ? 'default' : 'outline'} size="sm" className={quickFilter === 'high_margin' ? 'boq-quick-filter-active' : ''} onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'high_margin' ? undefined : 'high_margin', cursor: undefined })}>
                                                    High Margin
                                                </Button>
                                                <Button type="button" variant={quickFilter === 'low_margin' ? 'default' : 'outline'} size="sm" className={quickFilter === 'low_margin' ? 'boq-quick-filter-active' : ''} onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'low_margin' ? undefined : 'low_margin', cursor: undefined })}>
                                                    Low Margin
                                                </Button>
                                                <Button type="button" variant={quickFilter === 'unused' ? 'default' : 'outline'} size="sm" className={quickFilter === 'unused' ? 'boq-quick-filter-active' : ''} onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'unused' ? undefined : 'unused', cursor: undefined })}>
                                                    Unused Items
                                                </Button>
                                                <Button type="button" variant={quickFilter === 'high_cost' ? 'default' : 'outline'} size="sm" className={quickFilter === 'high_cost' ? 'boq-quick-filter-active' : ''} onClick={() => applyFiltersToUrl({ quick_filter: quickFilter === 'high_cost' ? undefined : 'high_cost', cursor: undefined })}>
                                                    High Cost
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
                                                    Reset
                                                </Button>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm">
                                                        Density: {density === 'compact' ? 'Compact' : 'Comfortable'}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuCheckboxItem checked={density === 'comfortable'} onCheckedChange={() => setDensity('comfortable')}>
                                                        Comfortable
                                                    </DropdownMenuCheckboxItem>
                                                    <DropdownMenuCheckboxItem checked={density === 'compact'} onCheckedChange={() => setDensity('compact')}>
                                                        Compact
                                                    </DropdownMenuCheckboxItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {boqItems.data.length} items{quickFilter ? ' (filtered)' : ''}
                                        </span>
                                    </div>
                                    <div
                                        ref={tableContainerRef}
                                        className="h-[420px] overflow-auto rounded-md border border-border bg-background"
                                    >
                                        <TooltipProvider delayDuration={200}>
                                        <div className="min-w-[800px]">
                                            <div
                                                className={`sticky top-0 z-10 grid border-b border-border bg-muted px-2 py-2 text-xs font-medium leading-tight shadow-sm boq-header ${density === 'compact' ? 'py-1' : ''}`}
                                                style={{ gridTemplateColumns: gridColumns }}
                                            >
                                                <div className="flex items-center justify-center">Risk</div>
                                                <div className="flex items-center justify-center">Anomaly</div>
                                                <div className={`flex items-center justify-center ${freezeColumns ? 'boq-col-checkbox' : ''}`} />
                                                <div className={`flex items-center justify-center ${freezeColumns ? 'boq-col-code' : ''}`}>Code</div>
                                                <div className={`flex items-center text-left ${freezeColumns ? 'boq-col-description' : ''}`}>Description</div>
                                                {visibleColumns.unit && <div className="flex items-center justify-center">Unit</div>}
                                                {visibleColumns.qty && <div className="flex items-center justify-center">Qty</div>}
                                                {(visibleColumns.revenue || visibleColumns.estCost || visibleColumns.unitPrice || visibleColumns.unitCost || visibleColumns.profitPercent) && (
                                                    <>
                                                        {visibleColumns.revenue && <div className="flex flex-col items-center justify-center border-l border-border pl-1"><span>Revenue</span></div>}
                                                        {visibleColumns.estCost && <div className="flex flex-col items-center justify-center"><span>Est.</span><span>Cost</span></div>}
                                                        {visibleColumns.unitPrice && <div className="flex flex-col items-center justify-center"><span>Unit</span><span>Price</span></div>}
                                                        {visibleColumns.unitCost && <div className="flex flex-col items-center justify-center"><span>Unit</span><span>Cost</span></div>}
                                                        {visibleColumns.profitPercent && <div className="flex flex-col items-center justify-center"><span>Profit</span><span>%</span></div>}
                                                    </>
                                                )}
                                                {visibleColumns.pkgUse && <div className="flex flex-col items-center justify-center"><span>Pkg</span><span>Use</span></div>}
                                                {visibleColumns.rfqUse && <div className="flex flex-col items-center justify-center"><span>RFQ</span><span>Use</span></div>}
                                                {visibleColumns.actualCost && <div className="flex flex-col items-center justify-center"><span>Actual</span><span>Cost</span></div>}
                                            </div>
                                            <div
                                                className="relative mb-[60px]"
                                                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                                            >
                                                {virtualItems.map((virtualRow) => {
                                                    const item = boqItems.data[virtualRow.index];
                                                    const rev = parseFloat(item.revenue_amount ?? '0');
                                                    const cost = parseFloat(item.planned_cost ?? '0');
                                                    const qtyNum = parseFloat(item.qty ?? '0') || 0;
                                                    const unitPrice = qtyNum > 0 ? rev / qtyNum : null;
                                                    const unitCost = qtyNum > 0 ? cost / qtyNum : null;
                                                    const pct = estProfitPct(rev, cost);
                                                    const isEven = virtualRow.index % 2 === 0;
                                                    const rowBg = isEven ? 'bg-background' : 'bg-muted/20';
                                                    const risks = getRisksForRow(item);
                                                    const anomalies = getAnomaliesForRow(item, boqItems.data);
                                                    const hasCriticalRisk = pct !== null && pct < 5;
                                                    const isSelected = selectedItemIds.has(item.id);
                                                    const criticalHighlight = hasCriticalRisk && !isSelected ? 'boq-row-critical-risk' : '';
                                                    const anomalyHighlight = anomalies.length > 0 && !isSelected && !criticalHighlight ? 'boq-row-anomaly' : '';
                                                    const descriptionText = (item.description_en ?? '').trim() || '—';
                                                    const isDescriptionExpanded = expandedDescriptionRows.has(item.id);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            role="row"
                                                            tabIndex={0}
                                                            data-index={virtualRow.index}
                                                            ref={rowVirtualizer.measureElement}
                                                            className={`grid cursor-pointer border-b border-border px-2 text-sm hover:bg-muted/50 boq-row ${rowBg} ${criticalHighlight} ${anomalyHighlight} ${density === 'compact' ? 'py-1' : 'py-2'}`}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                minWidth: '800px',
                                                                minHeight: `${virtualRow.size}px`,
                                                                transform: `translateY(${virtualRow.start}px)`,
                                                                gridTemplateColumns: gridColumns,
                                                            }}
                                                            onClick={() => toggleItem(item.id, item)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    toggleItem(item.id, item);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                {risks.length === 0 ? (
                                                                    <span className="text-muted-foreground/40">—</span>
                                                                ) : (
                                                                    risks.map((r) => (
                                                                        <Tooltip key={r.id}>
                                                                            <TooltipTrigger asChild>
                                                                                <span className={`inline-flex ${r.colorClass}`} aria-label={r.message}>
                                                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top">
                                                                                <span>⚠ {r.message}</span>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ))
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                {anomalies.length === 0 ? (
                                                                    <span className="text-muted-foreground/40">—</span>
                                                                ) : (
                                                                    anomalies.map((a) => (
                                                                        <Tooltip key={a.id}>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="inline-flex text-amber-600" aria-label={a.message}>
                                                                                    🚨
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top">
                                                                                {a.message}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ))
                                                                )}
                                                            </div>
                                                            <div className={`flex items-center justify-center ${freezeColumns ? 'boq-col-checkbox' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                                <Checkbox
                                                                    checked={selectedItemIds.has(item.id)}
                                                                    onCheckedChange={() => toggleItem(item.id, item)}
                                                                    aria-label={`Select ${item.code}`}
                                                                />
                                                            </div>
                                                            <div className={`flex items-center justify-center truncate font-mono text-xs ${freezeColumns ? 'boq-col-code' : ''}`} title={item.code}>
                                                                {item.code}
                                                            </div>
                                                            <DescriptionCell
                                                                descriptionText={descriptionText}
                                                                itemCode={item.code}
                                                                isExpanded={isDescriptionExpanded}
                                                                className={freezeColumns ? 'boq-col-description' : ''}
                                                                onToggle={() => toggleDescriptionExpanded(item.id)}
                                                            />
                                                            {visibleColumns.unit && <div className="flex items-center justify-center truncate">{item.unit ?? '—'}</div>}
                                                            {visibleColumns.qty && <div className="flex items-center justify-center tabular-nums">{item.qty ?? '—'}</div>}
                                                            {visibleColumns.revenue && <div className="flex items-center justify-center tabular-nums">{formatCurrency(item.revenue_amount)}</div>}
                                                            {visibleColumns.estCost && <div className="flex items-center justify-center tabular-nums">{formatCurrency(item.planned_cost)}</div>}
                                                            {visibleColumns.unitPrice && <div className="flex items-center justify-center tabular-nums">{unitPrice != null ? formatCurrency(unitPrice) : '—'}</div>}
                                                            {visibleColumns.unitCost && <div className="flex items-center justify-center tabular-nums">{unitCost != null ? formatCurrency(unitCost) : '—'}</div>}
                                                            {visibleColumns.profitPercent && (
                                                                <div className={`flex items-center justify-center tabular-nums ${profitPctColorClass(pct)}`}>
                                                                    {pct != null ? formatPercent(pct) : '—'}
                                                                </div>
                                                            )}
                                                            {visibleColumns.pkgUse && <div className="flex items-center justify-center tabular-nums">{item.package_usage_count ?? 0}</div>}
                                                            {visibleColumns.rfqUse && <div className="flex items-center justify-center tabular-nums">{item.request_usage_count ?? 0}</div>}
                                                            {visibleColumns.actualCost && <div className="flex items-center justify-center tabular-nums">{formatCurrency(item.actual_cost_sum)}</div>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="selector-footer flex flex-nowrap items-center justify-between gap-6">
                                                <span className="text-sm font-medium shrink-0">Selected Items: <span className="tabular-nums">{summaryFromData.count}</span></span>
                                                <div className="flex flex-wrap items-center justify-end gap-4 text-sm font-medium">
                                                    <span>Revenue: <span className="tabular-nums">{formatCurrency(summaryFromData.revenue)}</span></span>
                                                    <span className="text-muted-foreground">|</span>
                                                    <span>Cost: <span className="tabular-nums">{formatCurrency(summaryFromData.cost)}</span></span>
                                                    <span className="text-muted-foreground">|</span>
                                                    <span>Margin: <span className={`tabular-nums ${profitPctColorClass(summaryFromData.profitPct)}`}>{summaryFromData.profitPct != null ? formatPercent(summaryFromData.profitPct) : '—'}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        </TooltipProvider>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!boqItems.prev_cursor}
                                                onClick={() => applyFiltersToUrl({ cursor: boqItems.prev_cursor ?? undefined })}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!boqItems.next_cursor}
                                                onClick={() => applyFiltersToUrl({ cursor: boqItems.next_cursor ?? undefined })}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Showing {boqItems.data.length} items{quickFilter ? ' (filtered)' : ' (cursor pagination)'}
                                        </span>
                                    </div>
                                    {form.errors.boq_item_ids && (
                                        <p className="text-sm text-destructive">{form.errors.boq_item_ids}</p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Selected items summary</CardTitle>
                            <CardDescription>
                                {selectedItemIds.size} selected. Totals from loaded selection (may be partial across pages).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-8 rounded-lg border border-border bg-muted/30 p-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Selected items</p>
                                    <p className="text-lg font-semibold tabular-nums">{summaryFromData.count}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Total revenue</p>
                                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(summaryFromData.revenue)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Estimated cost</p>
                                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(summaryFromData.cost)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Estimated profit</p>
                                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(summaryFromData.profit)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Profit %</p>
                                    <p className={`text-lg font-semibold tabular-nums ${profitPctColorClass(summaryFromData.profitPct)}`}>
                                        {summaryFromData.profitPct != null ? formatPercent(summaryFromData.profitPct) : '—'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upload files</CardTitle>
                            <CardDescription>
                                Specifications, drawings, BOQ, or other documents. Add file uploads or external links (e.g. Google Drive, Dropbox).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {form.data.attachments.map((att, i) => (
                                <div
                                    key={i}
                                    className="grid gap-4 rounded border border-border bg-muted/20 p-4"
                                    style={{ gridTemplateColumns: '160px 1fr 140px 1fr auto' }}
                                >
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium text-muted-foreground">Document type</Label>
                                        <Select
                                            value={att.document_type || 'other'}
                                            onValueChange={(v) => {
                                                const next = [...form.data.attachments];
                                                next[i] = { ...next[i], document_type: v };
                                                form.setData('attachments', next);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOCUMENT_TYPES.map((d) => (
                                                    <SelectItem key={d.value} value={d.value}>
                                                        {d.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                                        <Input
                                            value={att.title}
                                            onChange={(e) => {
                                                const next = [...form.data.attachments];
                                                next[i] = { ...next[i], title: e.target.value };
                                                form.setData('attachments', next);
                                            }}
                                            placeholder="Attachment title"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                                        <Select
                                            value={att.source_type}
                                            onValueChange={(v) => {
                                                const next = [...form.data.attachments];
                                                next[i] = { ...next[i], source_type: v, file: v === 'upload' ? next[i].file : null, external_url: v === 'upload' ? '' : next[i].external_url };
                                                form.setData('attachments', next);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SOURCE_TYPES.map((s) => (
                                                    <SelectItem key={s.value} value={s.value}>
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        {att.source_type === 'upload' ? (
                                            <>
                                                <Label className="text-xs font-medium text-muted-foreground">File</Label>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            const next = [...form.data.attachments];
                                                            next[i] = { ...next[i], file: file ?? null };
                                                            form.setData('attachments', next);
                                                        }}
                                                        className="cursor-pointer max-w-[220px]"
                                                    />
                                                    {att.file && (
                                                        <span className="text-sm text-muted-foreground" title={att.file.name}>
                                                            📎 {att.file.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Label className="text-xs font-medium text-muted-foreground">URL</Label>
                                                <Input
                                                    value={att.external_url}
                                                    onChange={(e) => {
                                                        const next = [...form.data.attachments];
                                                        next[i] = { ...next[i], external_url: e.target.value };
                                                        form.setData('attachments', next);
                                                    }}
                                                    placeholder="https://..."
                                                />
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachment(i)} aria-label="Remove">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addAttachment}>
                                <Plus className="h-4 w-4" />
                                Add attachment
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing || selectedItemIds.size === 0}>
                            {form.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create package
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('projects.procurement-packages.index', project.id)}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
