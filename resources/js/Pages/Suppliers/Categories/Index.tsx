import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { Badge } from '@/Components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Search,
    ChevronsDownUp,
    ChevronsUpDown,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useConfirm } from '@/hooks';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';

interface CategoryTreeNode {
    id: string;
    parent_id: string | null;
    code: string;
    name_en: string;
    name_ar: string;
    level: number;
    supplier_type: string;
    is_active: boolean;
    is_legacy?: boolean;
    suppliers_count: number;
    children_count: number;
    full_path_en: string;
    full_path_ar: string;
    created_at?: string;
    updated_at?: string;
    children: CategoryTreeNode[];
}

interface FlatCategory {
    id: string;
    parent_id: string | null;
    code: string;
    name_en: string;
    name_ar: string;
    level: number;
    supplier_type: string;
    is_active: boolean;
    is_legacy?: boolean;
    suppliers_count: number;
    children_count: number;
    full_path_en: string;
    full_path_ar: string;
    created_at?: string;
    updated_at?: string;
}

interface ImportResult {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; code: string | null; message: string }>;
}

interface CategoriesIndexProps {
    tree: CategoryTreeNode[];
    flatList: FlatCategory[];
    supplierTypes: string[];
    importResult?: ImportResult | null;
    importLevel?: number | null;
}

const STATUS_ALL = 'all';
const LEGACY_ALL = 'all';
const LEGACY_NORMAL = 'normal';
const LEGACY_LEGACY = 'legacy';
const LEVEL_ALL = 'all';

function getDescendantIds(flatList: FlatCategory[], id: string): Set<string> {
    const set = new Set<string>();
    const stack = [id];
    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const c of flatList) {
            if (c.parent_id === current) {
                set.add(c.id);
                stack.push(c.id);
            }
        }
    }
    return set;
}

type TabId = 'manage' | 'import_main' | 'import_sub' | 'import_leaf';

export default function Index({ tree, flatList, supplierTypes, importResult, importLevel }: CategoriesIndexProps) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale();
    const locale = (usePage().props as { locale?: string }).locale ?? 'en';
    const [activeTab, setActiveTab] = useState<TabId>('manage');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [filterType, setFilterType] = useState<string>(STATUS_ALL);
    const [filterStatus, setFilterStatus] = useState<string>(STATUS_ALL);
    const [filterLegacy, setFilterLegacy] = useState<string>(LEGACY_ALL);
    const [filterLevel, setFilterLevel] = useState<string>(LEVEL_ALL);
    const [filterMainId, setFilterMainId] = useState<string>('all');
    const [filterSubId, setFilterSubId] = useState<string>('all');
    const [filterLeafId, setFilterLeafId] = useState<string>('all');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<'none' | 'view' | 'add_root' | 'add_child'>('none');
    const [addChildParentId, setAddChildParentId] = useState<string | null>(null);

    const mainCategories = useMemo(() => flatList.filter((c) => c.level === 1), [flatList]);
    const subMainOptions = useMemo(() => {
        if (filterMainId === 'all' || !filterMainId) return flatList.filter((c) => c.level === 2);
        return flatList.filter((c) => c.level === 2 && c.parent_id === filterMainId);
    }, [flatList, filterMainId]);
    const leafOptions = useMemo(() => {
        if (filterSubId === 'all' || !filterSubId) return flatList.filter((c) => c.level === 3);
        return flatList.filter((c) => c.level === 3 && c.parent_id === filterSubId);
    }, [flatList, filterSubId]);

    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounced(searchQuery.trim().toLowerCase()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredFlat = useMemo(() => {
        let list = flatList;
        const q = searchDebounced;
        if (q) {
            list = list.filter(
                (c) =>
                    c.code.toLowerCase().includes(q) ||
                    c.name_en.toLowerCase().includes(q) ||
                    (c.name_ar ?? '').toLowerCase().includes(q) ||
                    (c.full_path_en ?? '').toLowerCase().includes(q) ||
                    (c.full_path_ar ?? '').toLowerCase().includes(q)
            );
            const needAncestors = new Set<string>();
            for (const c of list) {
                let cur: FlatCategory | undefined = c;
                while (cur?.parent_id) {
                    const parent = flatList.find((x) => x.id === cur!.parent_id);
                    if (parent) {
                        needAncestors.add(parent.id);
                        cur = parent;
                    } else break;
                }
            }
            list = flatList.filter((c) => list.some((x) => x.id === c.id) || needAncestors.has(c.id));
        }
        if (filterType !== STATUS_ALL) {
            list = list.filter((c) => c.supplier_type === filterType);
        }
        if (filterStatus === 'active') list = list.filter((c) => c.is_active);
        if (filterStatus === 'inactive') list = list.filter((c) => !c.is_active);
        if (filterLegacy === LEGACY_NORMAL) list = list.filter((c) => !(c.is_legacy ?? false));
        if (filterLegacy === LEGACY_LEGACY) list = list.filter((c) => c.is_legacy === true);
        if (filterLevel !== LEVEL_ALL) {
            const l = parseInt(filterLevel, 10);
            if (!Number.isNaN(l)) list = list.filter((c) => c.level === l);
        }
        if (filterLeafId && filterLeafId !== 'all') {
            list = list.filter((c) => c.id === filterLeafId);
        } else if (filterSubId && filterSubId !== 'all') {
            const branchIds = new Set<string>([filterSubId, ...getDescendantIds(flatList, filterSubId)]);
            list = list.filter((c) => branchIds.has(c.id));
        } else if (filterMainId && filterMainId !== 'all') {
            const branchIds = new Set<string>([filterMainId, ...getDescendantIds(flatList, filterMainId)]);
            list = list.filter((c) => branchIds.has(c.id));
        }
        return list;
    }, [flatList, searchDebounced, filterType, filterStatus, filterLegacy, filterLevel, filterMainId, filterSubId, filterLeafId]);

    const filteredTree = useMemo(() => {
        const visibleIds = new Set(filteredFlat.map((c) => c.id));
        function build(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
            const out: CategoryTreeNode[] = [];
            for (const n of nodes) {
                if (!visibleIds.has(n.id)) continue;
                const children = build(n.children ?? []);
                out.push({ ...n, children });
            }
            return out;
        }
        return build(tree);
    }, [tree, filteredFlat]);

    const selectedCategory = selectedId ? flatList.find((c) => c.id === selectedId) ?? null : null;
    const selectedInFiltered = selectedId ? filteredFlat.some((c) => c.id === selectedId) : false;

    const expandAll = useCallback(() => {
        const withChildren = new Set<string>();
        function collect(nodes: CategoryTreeNode[]) {
            for (const n of nodes) {
                if ((n.children?.length ?? 0) > 0) {
                    withChildren.add(n.id);
                    collect(n.children);
                }
            }
        }
        collect(filteredTree);
        setExpandedIds(withChildren);
    }, [filteredTree]);

    const collapseAll = useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const detailForm = useForm({
        parent_id: null as string | null,
        code: '',
        name_en: '',
        name_ar: '',
        supplier_type: 'material_supplier',
        is_active: true,
    });

    useEffect(() => {
        if (mode === 'view' && selectedCategory) {
            detailForm.setData({
                parent_id: selectedCategory.parent_id,
                code: selectedCategory.code,
                name_en: selectedCategory.name_en,
                name_ar: selectedCategory.name_ar,
                supplier_type: selectedCategory.supplier_type,
                is_active: selectedCategory.is_active,
            });
        }
        if (mode === 'add_root') {
            detailForm.setData({
                parent_id: null,
                code: '',
                name_en: '',
                name_ar: '',
                supplier_type: 'material_supplier',
                is_active: true,
            });
        }
        if (mode === 'add_child' && addChildParentId) {
            const parent = flatList.find((c) => c.id === addChildParentId);
            detailForm.setData({
                parent_id: addChildParentId,
                code: '',
                name_en: '',
                name_ar: '',
                supplier_type: parent?.supplier_type ?? 'material_supplier',
                is_active: true,
            });
        }
    }, [mode, selectedId, addChildParentId]);

    const validParentOptions = useMemo(() => {
        if (mode === 'add_root' || (mode === 'add_child' && addChildParentId)) return [];
        if (!selectedCategory) return flatList.filter((c) => c.level < 3);
        const descendantIds = getDescendantIds(flatList, selectedCategory.id);
        return flatList.filter(
            (c) =>
                c.level < 3 &&
                c.id !== selectedCategory.id &&
                !descendantIds.has(c.id)
        );
    }, [flatList, selectedCategory, mode, addChildParentId]);

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'view' && selectedId) {
            detailForm.put(route('settings.supplier-categories.update', selectedId), {
                onSuccess: () => {
                    toast.success(t('category_updated', 'supplier_categories'));
                },
                onError: () => {},
            });
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        detailForm.post(route('settings.supplier-categories.store'), {
            onSuccess: () => {
                toast.success(t('category_created', 'supplier_categories'));
                setMode('none');
                setAddChildParentId(null);
                detailForm.reset();
            },
            onError: () => {},
        });
    };

    const handleDelete = () => {
        if (!selectedCategory) return;
        confirmDelete(t('categories_confirm_delete', 'admin', { name: selectedCategory.name_en })).then((confirmed) => {
            if (confirmed) {
                router.delete(route('settings.supplier-categories.destroy', selectedCategory.id), {
                    onSuccess: () => {
                        toast.success(t('category_deleted', 'supplier_categories'));
                        setSelectedId(null);
                        setMode('none');
                    },
                    onError: (errors) => {
                        const msg = (errors as { category?: string }).category;
                        if (msg) toast.error(msg);
                    },
                });
            }
        });
    };

    const handleAddRoot = () => {
        setSelectedId(null);
        setMode('add_root');
        setAddChildParentId(null);
    };

    const handleAddChild = () => {
        if (!selectedCategory || selectedCategory.level >= 3) return;
        setAddChildParentId(selectedCategory.id);
        setMode('add_child');
        const parent = flatList.find((c) => c.id === selectedCategory.id);
        detailForm.setData({
            parent_id: selectedCategory.id,
            code: '',
            name_en: '',
            name_ar: '',
            supplier_type: parent?.supplier_type ?? 'material_supplier',
            is_active: true,
        });
    };

    const handleSelectNode = (id: string) => {
        setSelectedId(id);
        setMode('view');
        setAddChildParentId(null);
    };

    return (
        <AppLayout>
            <Head title={t('categories_title', 'admin')} />
            <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('categories_title', 'admin')}
                    </h1>
                </div>

                {/* A) TOP TOOLBAR */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 pt-4">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                            <Input
                                type="search"
                                placeholder={t('search_placeholder', 'supplier_categories')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-9"
                                aria-label={t('search', 'supplier_categories')}
                            />
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('filter_by_type', 'supplier_categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={STATUS_ALL}>{t('all_types', 'supplier_categories')}</SelectItem>
                                {supplierTypes.map((st) => (
                                    <SelectItem key={st} value={st}>
                                        {st.replace(/_/g, ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={STATUS_ALL}>{t('all_statuses', 'supplier_categories')}</SelectItem>
                                <SelectItem value="active">{t('active', 'supplier_categories')}</SelectItem>
                                <SelectItem value="inactive">{t('inactive', 'supplier_categories')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterLegacy} onValueChange={setFilterLegacy}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={LEGACY_ALL}>{t('all_statuses', 'supplier_categories')}</SelectItem>
                                <SelectItem value={LEGACY_NORMAL}>{t('normal_only', 'supplier_categories')}</SelectItem>
                                <SelectItem value={LEGACY_LEGACY}>{t('legacy_only', 'supplier_categories')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={LEVEL_ALL}>{t('all_levels', 'supplier_categories')}</SelectItem>
                                <SelectItem value="1">{t('level_1', 'supplier_categories')}</SelectItem>
                                <SelectItem value="2">{t('level_2', 'supplier_categories')}</SelectItem>
                                <SelectItem value="3">{t('level_3', 'supplier_categories')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filterMainId}
                            onValueChange={(v) => {
                                setFilterMainId(v);
                                setFilterSubId('all');
                                setFilterLeafId('all');
                            }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={t('filter_main_category', 'supplier_categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_statuses', 'supplier_categories')}</SelectItem>
                                {mainCategories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {locale === 'ar' ? c.name_ar : c.name_en} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filterSubId}
                            onValueChange={(v) => {
                                setFilterSubId(v);
                                setFilterLeafId('all');
                            }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={t('filter_sub_main_category', 'supplier_categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_statuses', 'supplier_categories')}</SelectItem>
                                {subMainOptions.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {locale === 'ar' ? c.name_ar : c.name_en} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterLeafId} onValueChange={setFilterLeafId}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={t('filter_leaf_category', 'supplier_categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_statuses', 'supplier_categories')}</SelectItem>
                                {leafOptions.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {locale === 'ar' ? c.name_ar : c.name_en} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="sm" onClick={expandAll}>
                                <ChevronsDownUp className="h-4 w-4" />
                                {t('expand_all', 'supplier_categories')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
                                <ChevronsUpDown className="h-4 w-4" />
                                {t('collapse_all', 'supplier_categories')}
                            </Button>
                        </div>
                        <Button onClick={handleAddRoot}>
                            <Plus className="h-4 w-4" />
                            {t('create_root', 'supplier_categories')}
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={route('settings.supplier-categories.export')} download>
                                <Download className="h-4 w-4" />
                                {t('export_excel', 'supplier_categories')}
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                {/* TABS */}
                <div className="flex flex-1 flex-col min-h-0">
                    <div className="inline-flex gap-2 border-b border-border pb-2">
                        {(['manage', 'import_main', 'import_sub', 'import_leaf'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab === 'manage' && t('tab_manage', 'supplier_categories')}
                                {tab === 'import_main' && t('tab_import_main', 'supplier_categories')}
                                {tab === 'import_sub' && t('tab_import_sub', 'supplier_categories')}
                                {tab === 'import_leaf' && t('tab_import_leaf', 'supplier_categories')}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'manage' && (
                        <div className="flex flex-1 min-h-0 flex-col mt-3">
                        {/* B) LEFT TREE + C) RIGHT PANEL */}
                <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
                    {/* LEFT — Category tree */}
                    <Card className="flex min-h-0 flex-col">
                        <CardHeader className="py-3">
                            <CardTitle className="text-base">{t('available_categories', 'supplier_categories')}</CardTitle>
                            <CardDescription>
                                {filteredFlat.length} {locale === 'ar' ? 'فئة' : 'categories'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-auto p-2">
                            {filteredTree.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    {t('no_categories_found', 'supplier_categories')}
                                </p>
                            ) : (
                                <TreeNodes
                                    nodes={filteredTree}
                                    locale={locale}
                                    expandedIds={expandedIds}
                                    setExpandedIds={setExpandedIds}
                                    selectedId={selectedId}
                                    onSelect={handleSelectNode}
                                    t={(key, ns) => t(key, (ns as 'supplier_categories') || 'supplier_categories')}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* RIGHT — Details / Editor */}
                    <Card className="flex min-h-0 flex-col">
                        <CardHeader className="py-3">
                            <CardTitle className="text-base">{t('category_details', 'supplier_categories')}</CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-auto space-y-4">
                            {mode === 'none' && (
                                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground">
                                    <p className="text-sm">{t('no_category_selected', 'supplier_categories')}</p>
                                    <Button onClick={handleAddRoot}>
                                        <Plus className="h-4 w-4" />
                                        {t('create_root', 'supplier_categories')}
                                    </Button>
                                </div>
                            )}

                            {selectedId && !selectedInFiltered && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                    {t('selected_hidden_by_filter', 'supplier_categories')}
                                </div>
                            )}

                            {(mode === 'view' && selectedCategory) || mode === 'add_root' || mode === 'add_child' ? (
                                <div className="space-y-4">
                                    {(mode === 'add_root' || mode === 'add_child') && (
                                        <form onSubmit={handleCreate} className="space-y-4">
                                            {mode === 'add_child' && addChildParentId && (() => {
                                                const parent = flatList.find((c) => c.id === addChildParentId);
                                                return parent ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('add_child', 'supplier_categories')}: {locale === 'ar' ? parent.full_path_ar : parent.full_path_en}
                                                    </p>
                                                ) : null;
                                            })()}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="code">{t('code', 'supplier_categories')} *</Label>
                                                    <Input
                                                        id="code"
                                                        value={detailForm.data.code}
                                                        onChange={(e) => detailForm.setData('code', e.target.value)}
                                                        required
                                                    />
                                                    {detailForm.errors.code && (
                                                        <p className="text-sm text-destructive">{detailForm.errors.code}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('supplier_type', 'supplier_categories')}</Label>
                                                    <Select
                                                        value={detailForm.data.supplier_type}
                                                        onValueChange={(v) => detailForm.setData('supplier_type', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {supplierTypes.map((st) => (
                                                                <SelectItem key={st} value={st}>
                                                                    {st.replace(/_/g, ' ')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="name_en">Name (EN) *</Label>
                                                <Input
                                                    id="name_en"
                                                    value={detailForm.data.name_en}
                                                    onChange={(e) => detailForm.setData('name_en', e.target.value)}
                                                    required
                                                />
                                                {detailForm.errors.name_en && (
                                                    <p className="text-sm text-destructive">{detailForm.errors.name_en}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="name_ar">Name (AR) *</Label>
                                                <Input
                                                    id="name_ar"
                                                    value={detailForm.data.name_ar}
                                                    onChange={(e) => detailForm.setData('name_ar', e.target.value)}
                                                    required
                                                    dir="rtl"
                                                />
                                                {detailForm.errors.name_ar && (
                                                    <p className="text-sm text-destructive">{detailForm.errors.name_ar}</p>
                                                )}
                                            </div>
                                            <label className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={detailForm.data.is_active}
                                                    onCheckedChange={(c) => detailForm.setData('is_active', c === true)}
                                                />
                                                <span className="text-sm">{t('active', 'supplier_categories')}</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <Button type="submit" disabled={detailForm.processing}>
                                                    {detailForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                                    {t('action_save', 'admin')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setMode('none');
                                                        setAddChildParentId(null);
                                                    }}
                                                >
                                                    {t('cancel', 'supplier_categories')}
                                                </Button>
                                            </div>
                                        </form>
                                    )}

                                    {mode === 'view' && selectedCategory && (
                                        <>
                                            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
                                                <div><span className="font-medium text-muted-foreground">ID:</span> <span className="font-mono text-xs">{selectedCategory.id}</span></div>
                                                <div><span className="font-medium text-muted-foreground">{t('level', 'supplier_categories')}:</span> {selectedCategory.level}</div>
                                                <div><span className="font-medium text-muted-foreground">{t('full_path_en', 'supplier_categories')}:</span> {selectedCategory.full_path_en || '—'}</div>
                                                <div><span className="font-medium text-muted-foreground">{t('full_path_ar', 'supplier_categories')}:</span> {selectedCategory.full_path_ar || '—'}</div>
                                                {selectedCategory.created_at && (
                                                    <div><span className="font-medium text-muted-foreground">Created:</span> {new Date(selectedCategory.created_at).toLocaleString()}</div>
                                                )}
                                                {selectedCategory.updated_at && (
                                                    <div><span className="font-medium text-muted-foreground">Updated:</span> {new Date(selectedCategory.updated_at).toLocaleString()}</div>
                                                )}
                                                <div><span className="font-medium text-muted-foreground">{t('children_count', 'supplier_categories')}:</span> {selectedCategory.children_count}</div>
                                                <div><span className="font-medium text-muted-foreground">{t('suppliers_count', 'supplier_categories')}:</span> {selectedCategory.suppliers_count}</div>
                                            </div>

                                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>{t('parent_category', 'supplier_categories')}</Label>
                                                        <Select
                                                            value={detailForm.data.parent_id ?? 'none'}
                                                            onValueChange={(v) => detailForm.setData('parent_id', v === 'none' ? null : v)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('no_parent', 'supplier_categories')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">{t('no_parent', 'supplier_categories')}</SelectItem>
                                                                {validParentOptions.map((c) => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        {locale === 'ar' ? (c.full_path_ar || c.name_ar) : (c.full_path_en || c.name_en)} ({c.code})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {detailForm.errors.parent_id && (
                                                            <p className="text-sm text-destructive">{detailForm.errors.parent_id}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="edit_code">{t('code', 'supplier_categories')} *</Label>
                                                        <Input
                                                            id="edit_code"
                                                            value={detailForm.data.code}
                                                            onChange={(e) => detailForm.setData('code', e.target.value)}
                                                            required
                                                        />
                                                        {detailForm.errors.code && (
                                                            <p className="text-sm text-destructive">{detailForm.errors.code}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Name (EN) *</Label>
                                                    <Input
                                                        value={detailForm.data.name_en}
                                                        onChange={(e) => detailForm.setData('name_en', e.target.value)}
                                                        required
                                                    />
                                                    {detailForm.errors.name_en && (
                                                        <p className="text-sm text-destructive">{detailForm.errors.name_en}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Name (AR) *</Label>
                                                    <Input
                                                        value={detailForm.data.name_ar}
                                                        onChange={(e) => detailForm.setData('name_ar', e.target.value)}
                                                        required
                                                        dir="rtl"
                                                    />
                                                    {detailForm.errors.name_ar && (
                                                        <p className="text-sm text-destructive">{detailForm.errors.name_ar}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('supplier_type', 'supplier_categories')}</Label>
                                                    <Select
                                                        value={detailForm.data.supplier_type}
                                                        onValueChange={(v) => detailForm.setData('supplier_type', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {supplierTypes.map((st) => (
                                                                <SelectItem key={st} value={st}>
                                                                    {st.replace(/_/g, ' ')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <label className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={detailForm.data.is_active}
                                                        onCheckedChange={(c) => detailForm.setData('is_active', c === true)}
                                                    />
                                                    <span className="text-sm">{t('active', 'supplier_categories')}</span>
                                                </label>
                                                {selectedCategory.is_legacy && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('legacy', 'supplier_categories')} (read-only)
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="submit" disabled={detailForm.processing}>
                                                        {detailForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                                        {t('save_changes', 'supplier_categories')}
                                                    </Button>
                                                    {selectedCategory.level < 3 && (
                                                        <Button type="button" variant="outline" onClick={handleAddChild}>
                                                            <Plus className="h-4 w-4" />
                                                            {t('add_child_category', 'supplier_categories')}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        onClick={handleDelete}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('delete_category', 'supplier_categories')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedId(null);
                                                            setMode('none');
                                                        }}
                                                    >
                                                        {t('cancel', 'supplier_categories')}
                                                    </Button>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
                        </div>
                    )}
                    {activeTab === 'import_main' && (
                        <ImportTab
                            level={1}
                            instructionsKey="import_instructions_main"
                            templateRoute="settings.supplier-categories.template.main"
                            importRoute="settings.supplier-categories.import.main"
                            templateLabelKey="download_template_main"
                            importResult={importLevel === 1 ? importResult : null}
                            t={(k) => t(k, 'supplier_categories')}
                        />
                    )}
                    {activeTab === 'import_sub' && (
                        <ImportTab
                            level={2}
                            instructionsKey="import_instructions_sub"
                            templateRoute="settings.supplier-categories.template.sub"
                            importRoute="settings.supplier-categories.import.sub"
                            templateLabelKey="download_template_sub"
                            importResult={importLevel === 2 ? importResult : null}
                            t={(k) => t(k, 'supplier_categories')}
                        />
                    )}
                    {activeTab === 'import_leaf' && (
                        <ImportTab
                            level={3}
                            instructionsKey="import_instructions_leaf"
                            templateRoute="settings.supplier-categories.template.leaf"
                            importRoute="settings.supplier-categories.import.leaf"
                            templateLabelKey="download_template_leaf"
                            importResult={importLevel === 3 ? importResult : null}
                            t={(k) => t(k, 'supplier_categories')}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function ImportTab({
    level,
    instructionsKey,
    templateRoute,
    importRoute,
    templateLabelKey,
    importResult,
    t,
}: {
    level: number;
    instructionsKey: string;
    templateRoute: string;
    importRoute: string;
    templateLabelKey: string;
    importResult: ImportResult | null | undefined;
    t: (key: string) => string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submitImport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setSubmitting(true);
        const formData = new FormData();
        formData.append('file', file);
        router.post(route(importRoute), formData, {
            forceFormData: true,
            onFinish: () => setSubmitting(false),
        });
    };
    return (
        <div className="mt-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                        {level === 1 && t('import_main')}
                        {level === 2 && t('import_sub')}
                        {level === 3 && t('import_leaf')}
                    </CardTitle>
                    <CardDescription>{t(instructionsKey)}</CardDescription>
                    <p className="text-xs text-muted-foreground">{t('import_file_accepted')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" asChild>
                        <a href={route(templateRoute)} download>
                            <Download className="h-4 w-4" />
                            {t(templateLabelKey)}
                        </a>
                    </Button>
                    <form onSubmit={submitImport} className="space-y-3">
                        <div>
                            <Label htmlFor={`import-file-${level}`}>Excel file</Label>
                            <Input
                                id={`import-file-${level}`}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <Button type="submit" disabled={!file || submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('import')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {importResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('import_result')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm">
                            {t('import_created')}: {importResult.created} · {t('import_updated')}: {importResult.updated} · {t('import_skipped')}: {importResult.skipped}
                        </p>
                        {importResult.errors.length > 0 && (
                            <div>
                                <p className="font-medium text-destructive">{t('import_errors')}:</p>
                                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                                    {importResult.errors.map((err, i) => (
                                        <li key={i}>
                                            Row {err.row}: {err.code ? `[${err.code}] ` : ''}{err.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function TreeNodes({
    nodes,
    locale,
    expandedIds,
    setExpandedIds,
    selectedId,
    onSelect,
    t,
    depth = 0,
}: {
    nodes: CategoryTreeNode[];
    locale: string;
    expandedIds: Set<string>;
    setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedId: string | null;
    onSelect: (id: string) => void;
    t: (key: string, ns?: string) => string;
    depth?: number;
}) {
    return (
        <ul className="space-y-0.5">
            {nodes.map((node) => {
                const hasChildren = (node.children?.length ?? 0) > 0;
                const isExpanded = expandedIds.has(node.id);
                const isSelected = selectedId === node.id;
                const name = locale === 'ar' ? node.name_ar : node.name_en;
                return (
                    <li key={node.id}>
                        <div
                            className={`
                                flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer
                                ${isSelected ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-muted/50'}
                                ${!node.is_active ? 'opacity-70' : ''}
                            `}
                            style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        >
                            <button
                                type="button"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasChildren) {
                                        setExpandedIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(node.id)) next.delete(node.id);
                                            else next.add(node.id);
                                            return next;
                                        });
                                    }
                                }}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                                {hasChildren ? (
                                    isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )
                                ) : (
                                    <span className="w-4" />
                                )}
                            </button>
                            <button
                                type="button"
                                className="min-w-0 flex-1 text-start"
                                onClick={() => onSelect(node.id)}
                            >
                                <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
                                <span className="mx-1.5">·</span>
                                <span className="font-medium truncate">{name}</span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5 flex-wrap justify-end">
                                <Badge variant="outline" className="text-xs">
                                    L{node.level}
                                </Badge>
                                <Badge variant="secondary" className="max-w-[100px] truncate text-xs">
                                    {node.supplier_type.replace(/_/g, ' ')}
                                </Badge>
                                {!node.is_active && (
                                    <Badge variant="pending">{t('inactive', 'supplier_categories')}</Badge>
                                )}
                                {node.is_legacy && (
                                    <Badge variant="outline">{t('legacy', 'supplier_categories')}</Badge>
                                )}
                                <span className="tabular-nums text-xs text-muted-foreground" title={t('suppliers_count', 'supplier_categories')}>
                                    {node.suppliers_count}
                                </span>
                            </div>
                        </div>
                        {hasChildren && isExpanded && node.children && (
                            <TreeNodes
                                nodes={node.children}
                                locale={locale}
                                expandedIds={expandedIds}
                                setExpandedIds={setExpandedIds}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                t={t}
                                depth={depth + 1}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
