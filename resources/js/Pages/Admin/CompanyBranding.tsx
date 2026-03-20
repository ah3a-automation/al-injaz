import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/Textarea';
import { Head, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';
import { getContrastRatio } from '@/utils/color';
import { Upload, ExternalLink } from 'lucide-react';

const THEME_DEFAULTS = {
    brand_primary_color: '#373d42',
    brand_secondary_color: '#bfa849',
    color_success: '#16a34a',
    color_warning: '#d97706',
    color_danger: '#dc2626',
    color_info: '#2563eb',
    color_sidebar_bg: '#373d42',
    color_sidebar_text: '#ffffff',
} as const;

interface BrandingPayload {
    company_name_en?: string | null;
    company_name_ar?: string | null;
    company_short_name_en?: string | null;
    company_short_name_ar?: string | null;
    company_logo_light?: string | null;
    company_logo_dark?: string | null;
    company_sidebar_icon?: string | null;
    company_favicon?: string | null;
    company_phone?: string | null;
    company_email?: string | null;
    company_website?: string | null;
    company_address?: string | null;
    sidebar_brand_mode?: string | null;
    brand_primary_color?: string | null;
    brand_secondary_color?: string | null;
    color_success?: string | null;
    color_warning?: string | null;
    color_danger?: string | null;
    color_info?: string | null;
    color_sidebar_bg?: string | null;
    color_sidebar_text?: string | null;
}

type ThemeColorKey = keyof typeof THEME_DEFAULTS;

type BrandingForm = {
    company_name_en: string;
    company_name_ar: string;
    company_short_name_en: string;
    company_short_name_ar: string;
    company_phone: string;
    company_email: string;
    company_website: string;
    company_address: string;
    sidebar_brand_mode: 'logo' | 'text' | 'logo_text';
    brand_primary_color: string;
    brand_secondary_color: string;
    color_success: string;
    color_warning: string;
    color_danger: string;
    color_info: string;
    color_sidebar_bg: string;
    color_sidebar_text: string;
    company_logo_light: File | null;
    company_logo_dark: File | null;
    company_sidebar_icon: File | null;
    company_favicon: File | null;
    remove_logo_light: boolean;
    remove_logo_dark: boolean;
    remove_sidebar_icon: boolean;
    remove_favicon: boolean;
};

interface CompanyBrandingProps {
    branding: BrandingPayload;
    brandingLastUpdatedAt?: string | null;
}

const BRAND_MODES: Array<{ value: 'logo' | 'text' | 'logo_text'; labelKey: string }> = [
    { value: 'logo', labelKey: 'sidebar_brand_logo' },
    { value: 'text', labelKey: 'sidebar_brand_text' },
    { value: 'logo_text', labelKey: 'sidebar_brand_logo_text' },
];

type AssetKey = 'logo_light' | 'logo_dark' | 'sidebar_icon' | 'favicon';

function savedAssetUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `/storage/${path}`;
}

function getInitialFormState(branding: BrandingPayload): BrandingForm {
    return {
        company_name_en: branding.company_name_en ?? '',
        company_name_ar: branding.company_name_ar ?? '',
        company_short_name_en: branding.company_short_name_en ?? '',
        company_short_name_ar: branding.company_short_name_ar ?? '',
        company_phone: branding.company_phone ?? '',
        company_email: branding.company_email ?? '',
        company_website: branding.company_website ?? '',
        company_address: branding.company_address ?? '',
        sidebar_brand_mode: (branding.sidebar_brand_mode as 'logo' | 'text' | 'logo_text') ?? 'logo_text',
        brand_primary_color: branding.brand_primary_color ?? THEME_DEFAULTS.brand_primary_color,
        brand_secondary_color: branding.brand_secondary_color ?? THEME_DEFAULTS.brand_secondary_color,
        color_success: branding.color_success ?? THEME_DEFAULTS.color_success,
        color_warning: branding.color_warning ?? THEME_DEFAULTS.color_warning,
        color_danger: branding.color_danger ?? THEME_DEFAULTS.color_danger,
        color_info: branding.color_info ?? THEME_DEFAULTS.color_info,
        color_sidebar_bg: branding.color_sidebar_bg ?? THEME_DEFAULTS.color_sidebar_bg,
        color_sidebar_text: branding.color_sidebar_text ?? THEME_DEFAULTS.color_sidebar_text,
        company_logo_light: null,
        company_logo_dark: null,
        company_sidebar_icon: null,
        company_favicon: null,
        remove_logo_light: false,
        remove_logo_dark: false,
        remove_sidebar_icon: false,
        remove_favicon: false,
    };
}

const SECTION_IDS = ['assets', 'identity', 'info', 'theme'] as const;

export default function CompanyBranding({ branding, brandingLastUpdatedAt }: CompanyBrandingProps) {
    const { t } = useLocale();
    const lastSavedLabel = useMemo(() => {
        if (!brandingLastUpdatedAt) return null;
        const d = new Date(brandingLastUpdatedAt);
        if (Number.isNaN(d.getTime())) return null;
        const diffMs = Date.now() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        let phrase: string;
        if (diffMin < 1) {
            phrase = t('just_now', 'admin');
        } else {
            phrase = t('minutes_ago', 'admin', { count: diffMin });
        }
        return t('last_saved', 'admin', { time: phrase });
    }, [brandingLastUpdatedAt, t]);
    const formRef = useRef<HTMLFormElement>(null);
    const refLogoLight = useRef<HTMLInputElement>(null);
    const refLogoDark = useRef<HTMLInputElement>(null);
    const refSidebarIcon = useRef<HTMLInputElement>(null);
    const refFavicon = useRef<HTMLInputElement>(null);
    const sectionRefs = useRef<Record<(typeof SECTION_IDS)[number], HTMLElement | null>>({
        assets: null,
        identity: null,
        info: null,
        theme: null,
    });
    const [objectUrls, setObjectUrls] = useState<Record<AssetKey, string | null>>({
        logo_light: null,
        logo_dark: null,
        sidebar_icon: null,
        favicon: null,
    });
    const [pendingRemove, setPendingRemove] = useState<AssetKey | null>(null);
    const [activeTab, setActiveTab] = useState<(typeof SECTION_IDS)[number]>('assets');

    const { data, setData, post, processing, errors, isDirty } = useForm<BrandingForm>(
        getInitialFormState(branding)
    );

    const hasFileChanges =
        !!data.company_logo_light || !!data.company_logo_dark || !!data.company_sidebar_icon || !!data.company_favicon;
    const isFormDirty = isDirty || hasFileChanges;

    // Object URLs for newly selected files; revoke on change or unmount
    useEffect(() => {
        const keys: AssetKey[] = ['logo_light', 'logo_dark', 'sidebar_icon', 'favicon'];
        const formKeys = ['company_logo_light', 'company_logo_dark', 'company_sidebar_icon', 'company_favicon'] as const;
        const next: Record<AssetKey, string | null> = { logo_light: null, logo_dark: null, sidebar_icon: null, favicon: null };
        keys.forEach((key, i) => {
            const file = data[formKeys[i]];
            if (file instanceof File) {
                next[key] = URL.createObjectURL(file);
            }
        });
        setObjectUrls((prev) => {
            (Object.keys(prev) as AssetKey[]).forEach((k) => {
                if (prev[k] && prev[k] !== next[k]) URL.revokeObjectURL(prev[k]!);
            });
            return next;
        });
        return () => {
            (Object.keys(next) as AssetKey[]).forEach((k) => {
                if (next[k]) URL.revokeObjectURL(next[k]!);
            });
        };
    }, [data.company_logo_light, data.company_logo_dark, data.company_sidebar_icon, data.company_favicon]);

    const scrollToSection = useCallback((id: (typeof SECTION_IDS)[number]) => {
        setActiveTab(id);
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const getPreviewImageUrl = useCallback(
        (key: AssetKey): string | null => {
            const removeKey = key === 'logo_light' ? 'remove_logo_light' : key === 'logo_dark' ? 'remove_logo_dark' : key === 'sidebar_icon' ? 'remove_sidebar_icon' : 'remove_favicon';
            if (data[removeKey]) return null;
            const fileKey = key === 'logo_light' ? 'company_logo_light' : key === 'logo_dark' ? 'company_logo_dark' : key === 'sidebar_icon' ? 'company_sidebar_icon' : 'company_favicon';
            const file = data[fileKey];
            if (file instanceof File) return objectUrls[key];
            const saved = key === 'logo_light' ? branding.company_logo_light : key === 'logo_dark' ? branding.company_logo_dark : key === 'sidebar_icon' ? branding.company_sidebar_icon : branding.company_favicon;
            return savedAssetUrl(saved);
        },
        [data, objectUrls, branding]
    );

    const handleRemoveAsset = useCallback(
        (flag: AssetKey) => {
            const removeKey: keyof Pick<BrandingForm, 'remove_logo_light' | 'remove_logo_dark' | 'remove_sidebar_icon' | 'remove_favicon'> =
                flag === 'logo_light' ? 'remove_logo_light' : flag === 'logo_dark' ? 'remove_logo_dark' : flag === 'sidebar_icon' ? 'remove_sidebar_icon' : 'remove_favicon';
            if (pendingRemove === flag) {
                setData(removeKey, true);
                post(route('admin.company.branding.update'), { forceFormData: true });
                setPendingRemove(null);
            } else {
                setPendingRemove(flag);
            }
        },
        [pendingRemove, setData, post]
    );

    const cancelRemove = useCallback(() => setPendingRemove(null), []);

    const resetColor = useCallback(
        (field: ThemeColorKey) => setData(field, THEME_DEFAULTS[field]),
        [setData]
    );

    const resetAllThemeColors = useCallback(() => {
        (Object.keys(THEME_DEFAULTS) as ThemeColorKey[]).forEach((key) => setData(key, THEME_DEFAULTS[key]));
    }, [setData]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            post(route('admin.company.branding.update'), { forceFormData: true });
        },
        [post]
    );

    const handleDiscard = useCallback(() => {
        setData(getInitialFormState(branding));
        setPendingRemove(null);
        [refLogoLight, refLogoDark, refSidebarIcon, refFavicon].forEach((ref) => {
            if (ref.current) ref.current.value = '';
        });
    }, [branding, setData]);

    useEffect(() => {
        if (!isFormDirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isFormDirty]);

    const displayName = data.company_name_en || data.company_name_ar || 'Company';
    const displayShortName = data.company_short_name_en || data.company_short_name_ar || 'Company';
    const logoLightPreview = getPreviewImageUrl('logo_light');
    const logoDarkPreview = getPreviewImageUrl('logo_dark');
    const sidebarIconPreview = getPreviewImageUrl('sidebar_icon');
    const faviconPreview = getPreviewImageUrl('favicon');
    const contrastPrimaryWhite = getContrastRatio(data.brand_primary_color, '#ffffff');
    const contrastSidebar = getContrastRatio(data.color_sidebar_bg, data.color_sidebar_text);
    const warnPrimaryContrast = contrastPrimaryWhite > 0 && contrastPrimaryWhite < 4.5;
    const warnSidebarContrast = contrastSidebar > 0 && contrastSidebar < 4.5;

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                let bestId: (typeof SECTION_IDS)[number] | null = null;
                let bestRatio = 0;
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    let id: (typeof SECTION_IDS)[number] | null = null;
                    (Object.entries(sectionRefs.current) as [typeof SECTION_IDS[number], HTMLElement | null][]).forEach(
                        ([key, el]) => {
                            if (el === entry.target) {
                                id = key;
                            }
                        }
                    );
                    if (id && entry.intersectionRatio > bestRatio) {
                        bestRatio = entry.intersectionRatio;
                        bestId = id;
                    }
                });
                if (bestId && bestId !== activeTab) {
                    setActiveTab(bestId);
                }
            },
            { root: null, threshold: 0.3, rootMargin: '-96px 0px -50% 0px' }
        );

        const elements: HTMLElement[] = [];
        (Object.values(sectionRefs.current) as (HTMLElement | null)[]).forEach((el) => {
            if (el) elements.push(el);
        });
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [activeTab]);

    return (
        <AppLayout>
            <Head title={t('company_branding_title', 'admin')} />
            <PageHeader title={t('company_branding_title', 'admin')} />
            {lastSavedLabel && !isFormDirty && (
                <p className="mt-1 text-xs text-muted-foreground">{lastSavedLabel}</p>
            )}

            {/* Section navigation (non-sticky) */}
            <div className="-mx-6 flex border-b border-border bg-background px-6 py-2">
                <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="Sections">
                    {SECTION_IDS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => scrollToSection(id)}
                            className={cn(
                                'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                activeTab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            {t(`tab_${id}`, 'admin')}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,0.45fr)]">
                <form ref={formRef} onSubmit={handleSubmit} className="branding-form min-w-0 space-y-6">
                    {/* A. Assets */}
                    <Card id="section-assets" ref={(el) => { sectionRefs.current.assets = el; }}>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('tab_assets', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(
                                [
                                    { key: 'logo_light' as const, labelKey: 'company_logo_light', accept: 'image/jpg,image/jpeg,image/png,image/svg+xml,image/webp', helpKey: 'upload_logo_light_help', ref: refLogoLight, formKey: 'company_logo_light' as const, removeKey: 'remove_logo_light' as const, previewClass: 'h-12 object-contain rounded border border-border bg-white p-1' },
                                    { key: 'logo_dark' as const, labelKey: 'company_logo_dark', accept: 'image/jpg,image/jpeg,image/png,image/svg+xml,image/webp', helpKey: 'upload_logo_dark_help', ref: refLogoDark, formKey: 'company_logo_dark' as const, removeKey: 'remove_logo_dark' as const, previewClass: 'h-12 object-contain rounded border border-border bg-gray-800 p-1' },
                                    { key: 'sidebar_icon' as const, labelKey: 'company_sidebar_icon', accept: 'image/jpg,image/jpeg,image/png,image/svg+xml,image/webp', helpKey: 'upload_sidebar_icon_help', ref: refSidebarIcon, formKey: 'company_sidebar_icon' as const, removeKey: 'remove_sidebar_icon' as const, previewClass: 'h-8 w-8 object-contain rounded border border-border bg-gray-800 p-0.5' },
                                    { key: 'favicon' as const, labelKey: 'company_favicon', accept: '.ico,image/png,image/svg+xml', helpKey: 'upload_favicon_help', ref: refFavicon, formKey: 'company_favicon' as const, removeKey: 'remove_favicon' as const, previewClass: 'h-8 w-8 object-contain' },
                                ] as const
                            ).map(({ key, labelKey, accept, helpKey, ref: inputRef, formKey, removeKey, previewClass }) => {
                                const previewUrl = getPreviewImageUrl(key);
                                const isPending = pendingRemove === key;
                                const err = errors[formKey];
                                const inputId = `branding_${formKey}`;
                                return (
                                    <div key={key} className="space-y-2">
                                        <Label htmlFor={inputId} className="text-start">
                                            {t(labelKey, 'admin')}
                                        </Label>
                                        <div className="flex flex-wrap items-start gap-3">
                                            <div
                                                className="flex min-h-[100px] w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                                                onClick={() => inputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary/50'); }}
                                                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary/50'); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('border-primary/50');
                                                    const file = e.dataTransfer.files?.[0];
                                                    if (file) setData(formKey, file);
                                                }}
                                            >
                                                <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
                                                <span className="text-center text-sm text-muted-foreground">{t('upload_click_or_drag', 'admin')}</span>
                                                {previewUrl && (
                                                    <img src={previewUrl} alt="" className={cn('mt-1', previewClass)} />
                                                )}
                                            </div>
                                            <input
                                                ref={inputRef}
                                                type="file"
                                                accept={accept}
                                                className="sr-only"
                                                id={inputId}
                                                onChange={(e) => setData(formKey, e.target.files?.[0] ?? null)}
                                            />
                                            {previewUrl && !data[removeKey] && (
                                                <div className="flex items-center gap-2">
                                                    {isPending ? (
                                                        <>
                                                            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => handleRemoveAsset(key)} disabled={processing}>
                                                                {t('remove_confirm', 'admin')}
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="sm" onClick={cancelRemove}>{t('remove_cancel', 'admin')}</Button>
                                                        </>
                                                    ) : (
                                                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAsset(key)} disabled={processing}>
                                                            {t('remove', 'admin')}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t(helpKey, 'admin')}</p>
                                        {err && <p className="text-sm text-destructive">{err}</p>}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* B. Identity */}
                    <Card id="section-identity" ref={(el) => { sectionRefs.current.identity = el; }}>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('tab_identity', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="company_name_en" className="text-start">{t('company_name_en', 'admin')}</Label>
                                    <Input id="company_name_en" value={data.company_name_en} onChange={(e) => setData('company_name_en', e.target.value)} className="w-full" />
                                    {errors.company_name_en && <p className="text-sm text-destructive">{errors.company_name_en}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_name_ar" className="text-start">{t('company_name_ar', 'admin')}</Label>
                                    <Input id="company_name_ar" value={data.company_name_ar} onChange={(e) => setData('company_name_ar', e.target.value)} className="w-full" dir="rtl" />
                                    {errors.company_name_ar && <p className="text-sm text-destructive">{errors.company_name_ar}</p>}
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="company_short_name_en" className="text-start">{t('company_short_name_en', 'admin')}</Label>
                                    <Input id="company_short_name_en" value={data.company_short_name_en} onChange={(e) => setData('company_short_name_en', e.target.value)} className="w-full" />
                                    {errors.company_short_name_en && <p className="text-sm text-destructive">{errors.company_short_name_en}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_short_name_ar" className="text-start">{t('company_short_name_ar', 'admin')}</Label>
                                    <Input id="company_short_name_ar" value={data.company_short_name_ar} onChange={(e) => setData('company_short_name_ar', e.target.value)} className="w-full" dir="rtl" />
                                    {errors.company_short_name_ar && <p className="text-sm text-destructive">{errors.company_short_name_ar}</p>}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{t('short_name_help', 'admin')}</p>
                        </CardContent>
                    </Card>

                    {/* C. Info */}
                    <Card id="section-info" ref={(el) => { sectionRefs.current.info = el; }}>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('tab_info', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-2xl">
                            <div className="space-y-2">
                                <Label htmlFor="company_phone" className="text-start">{t('company_phone', 'admin')}</Label>
                                <Input id="company_phone" value={data.company_phone} onChange={(e) => setData('company_phone', e.target.value)} className="w-full" />
                                {errors.company_phone && <p className="text-sm text-destructive">{errors.company_phone}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_email" className="text-start">{t('company_email', 'admin')}</Label>
                                <Input id="company_email" type="email" value={data.company_email} onChange={(e) => setData('company_email', e.target.value)} className="w-full" />
                                {errors.company_email && <p className="text-sm text-destructive">{errors.company_email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_website" className="text-start">{t('company_website', 'admin')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="company_website" type="url" value={data.company_website} onChange={(e) => setData('company_website', e.target.value)} className="w-full" />
                                    {data.company_website && /^https?:\/\/[^\s]+$/i.test(data.company_website) && (
                                        <a href={data.company_website.startsWith('http') ? data.company_website : `https://${data.company_website}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Open website">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                                {errors.company_website && <p className="text-sm text-destructive">{errors.company_website}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_address" className="text-start">{t('company_address', 'admin')}</Label>
                                <Textarea id="company_address" value={data.company_address} onChange={(e) => setData('company_address', e.target.value)} rows={3} className="w-full" />
                                {errors.company_address && <p className="text-sm text-destructive">{errors.company_address}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* D. Theme */}
                    <Card id="section-theme" ref={(el) => { sectionRefs.current.theme = el; }}>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('tab_theme', 'admin')}</CardTitle>
                            <CardDescription className="text-start">{t('sidebar_brand_mode_help', 'admin')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-start mb-2 block">{t('sidebar_brand_mode', 'admin')}</Label>
                                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('sidebar_brand_mode', 'admin')}>
                                    {BRAND_MODES.map((mode) => (
                                        <label
                                            key={mode.value}
                                            className={cn(
                                                'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors has-[:checked]:brand-accent-border has-[:checked]:brand-accent-bg-soft',
                                                data.sidebar_brand_mode === mode.value ? 'border-current' : 'border-border'
                                            )}
                                        >
                                            <div className="h-12 w-20 rounded bg-gray-800 flex items-center justify-center overflow-hidden" style={{ backgroundColor: data.color_sidebar_bg }}>
                                                {mode.value === 'logo' && (logoDarkPreview || logoLightPreview) && (
                                                    <img src={logoDarkPreview || logoLightPreview || ''} alt="" className="h-6 w-auto object-contain" />
                                                )}
                                                {mode.value === 'text' && <span className="text-xs font-semibold truncate max-w-full px-1" style={{ color: data.color_sidebar_text }}>{displayShortName}</span>}
                                                {mode.value === 'logo_text' && (
                                                    <div className="flex items-center gap-1">
                                                        {(logoDarkPreview || logoLightPreview) && <img src={logoDarkPreview || logoLightPreview || ''} alt="" className="h-5 w-auto object-contain shrink-0" />}
                                                        <span className="text-[10px] font-semibold truncate max-w-[60px]" style={{ color: data.color_sidebar_text }}>{displayShortName}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input type="radio" name="sidebar_brand_mode" value={mode.value} checked={data.sidebar_brand_mode === mode.value} onChange={() => setData('sidebar_brand_mode', mode.value)} className="sr-only" />
                                            <span className="text-xs font-medium">{t(`sidebar_mode_${mode.value}`, 'admin')}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.sidebar_brand_mode && <p className="mt-2 text-sm text-destructive">{errors.sidebar_brand_mode}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-sm font-medium">{t('brand_colors', 'admin')}</span>
                                    <Button type="button" variant="outline" size="sm" onClick={resetAllThemeColors}>{t('reset_theme_colors', 'admin')}</Button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { key: 'brand_primary_color' as const, labelKey: 'brand_primary_color', placeholder: '#373d42' },
                                        { key: 'brand_secondary_color' as const, labelKey: 'brand_secondary_color', placeholder: '#bfa849' },
                                    ].map(({ key, labelKey, placeholder }) => (
                                        <div key={key} className="space-y-1">
                                            <Label htmlFor={key} className="text-start text-sm">{t(labelKey, 'admin')}</Label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="color" id={`${key}_swatch`} value={data[key]} onChange={(e) => setData(key, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
                                                <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} placeholder={placeholder} className="w-28 font-mono text-sm" />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => resetColor(key)}>{t('reset', 'admin')}</Button>
                                            </div>
                                            {key === 'brand_primary_color' && warnPrimaryContrast && <p className="text-xs text-amber-600 dark:text-amber-400">{t('contrast_warning_low', 'admin')}</p>}
                                            {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-sm font-medium text-muted-foreground">{t('semantic_colors', 'admin')}</span>
                                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { key: 'color_success' as const, labelKey: 'color_success' },
                                        { key: 'color_warning' as const, labelKey: 'color_warning' },
                                        { key: 'color_danger' as const, labelKey: 'color_danger' },
                                        { key: 'color_info' as const, labelKey: 'color_info' },
                                    ].map(({ key, labelKey }) => (
                                        <div key={key} className="space-y-1">
                                            <Label htmlFor={key} className="text-start text-sm">{t(labelKey, 'admin')}</Label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="color" id={`${key}_swatch`} value={data[key]} onChange={(e) => setData(key, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
                                                <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} className="w-28 font-mono text-sm" />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => resetColor(key)}>{t('reset', 'admin')}</Button>
                                            </div>
                                            {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-sm font-medium text-muted-foreground">{t('layout_colors', 'admin')}</span>
                                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { key: 'color_sidebar_bg' as const, labelKey: 'color_sidebar_bg' },
                                        { key: 'color_sidebar_text' as const, labelKey: 'color_sidebar_text' },
                                    ].map(({ key, labelKey }) => (
                                        <div key={key} className="space-y-1">
                                            <Label htmlFor={key} className="text-start text-sm">{t(labelKey, 'admin')}</Label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input type="color" id={`${key}_swatch`} value={data[key]} onChange={(e) => setData(key, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
                                                <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} className="w-28 font-mono text-sm" />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => resetColor(key)}>{t('reset', 'admin')}</Button>
                                            </div>
                                            {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
                                        </div>
                                    ))}
                                </div>
                                {warnSidebarContrast && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('contrast_warning_low', 'admin')}</p>}
                            </div>
                        </CardContent>
                    </Card>

                </form>

                {/* Sticky live preview panel — reads from useForm().data only */}
                <aside
                    id="branding-preview-panel"
                    className="sticky top-[4.5rem] hidden min-h-0 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 lg:block"
                >
                    <h3 className="text-sm font-semibold text-foreground mb-4">{t('tab_preview', 'admin')}</h3>
                    <div className="space-y-5">
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_login', 'admin')}</span>
                            <div className="mt-1 rounded border border-border bg-white p-4 shadow-sm">
                                {(logoLightPreview || logoDarkPreview) ? (
                                    <img src={logoLightPreview || logoDarkPreview || ''} alt="" className="h-10 w-auto object-contain mx-auto mb-2" />
                                ) : null}
                                <p className="text-center text-sm font-medium text-foreground">{displayName}</p>
                                <div className="mt-2 h-9 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Login form</div>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_sidebar', 'admin')}</span>
                            <div className="mt-1 rounded border border-border overflow-hidden w-36" style={{ backgroundColor: data.color_sidebar_bg }}>
                                <div className="p-2 flex items-center gap-2 border-b border-white/10">
                                    {(logoDarkPreview || logoLightPreview) && data.sidebar_brand_mode !== 'text' && (
                                        <img src={logoDarkPreview || logoLightPreview || ''} alt="" className="h-5 w-auto object-contain" />
                                    )}
                                    {(data.sidebar_brand_mode === 'text' || data.sidebar_brand_mode === 'logo_text') && (
                                        <span className="text-xs font-semibold truncate" style={{ color: data.color_sidebar_text }}>{displayShortName}</span>
                                    )}
                                </div>
                                <div className="px-2 py-1 text-xs" style={{ color: data.color_sidebar_text, opacity: 0.85 }}>{t('preview_sidebar_item', 'admin')}</div>
                                <div className="px-2 py-1 text-xs border-s-2" style={{ color: data.brand_secondary_color, borderColor: data.brand_secondary_color, backgroundColor: 'rgba(255,255,255,0.1)' }}>{t('preview_sidebar_active', 'admin')}</div>
                                <div className="p-2 flex justify-center border-t border-white/10">
                                    {sidebarIconPreview ? <img src={sidebarIconPreview} alt="" className="h-5 w-5 object-contain" /> : <span className="text-[10px] font-semibold" style={{ color: data.color_sidebar_text }}>{displayShortName.slice(0, 2)}</span>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_buttons', 'admin')}</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                                <span className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-white" style={{ backgroundColor: data.brand_primary_color }}>{t('preview_primary_button', 'admin')}</span>
                                <span className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium">{t('preview_secondary_button', 'admin')}</span>
                                <span className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-white" style={{ backgroundColor: data.color_danger }}>{t('preview_danger_button', 'admin')}</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_badges', 'admin')}</span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${data.color_success} 15%, transparent)`, color: data.color_success }}>{t('preview_success_badge', 'admin')}</span>
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${data.color_warning} 15%, transparent)`, color: data.color_warning }}>{t('preview_warning_badge', 'admin')}</span>
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${data.color_danger} 15%, transparent)`, color: data.color_danger }}>{t('preview_danger_badge', 'admin')}</span>
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${data.color_info} 15%, transparent)`, color: data.color_info }}>{t('preview_info_badge', 'admin')}</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_favicon', 'admin')}</span>
                            <div className="mt-1 rounded-t border border-b-0 border-border bg-muted/50 px-2 py-1.5 flex items-center gap-2 min-w-[140px]">
                                {faviconPreview ? <img src={faviconPreview} alt="" className="h-4 w-4 object-contain" /> : <span className="h-4 w-4 rounded bg-muted" />}
                                <span className="text-xs truncate text-muted-foreground">{displayShortName}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground px-2 py-1 border border-border rounded-b bg-muted/30">{t('preview_browser_tab', 'admin')}</p>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-muted-foreground">{t('preview_swatches', 'admin')}</span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {(['brand_primary_color', 'brand_secondary_color', 'color_success', 'color_warning', 'color_danger', 'color_info', 'color_sidebar_bg', 'color_sidebar_text'] as const).map((key) => (
                                    <div key={key} className="flex flex-col items-center gap-0.5">
                                        <span className="h-6 w-6 rounded border border-border shrink-0" style={{ backgroundColor: data[key] }} aria-hidden />
                                        <span className="text-[9px] text-muted-foreground max-w-[52px] truncate text-center">{t(key, 'admin')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Sticky save bar */}
            {isFormDirty && (
                <div className="sticky bottom-0 z-20 -mx-6 mt-6 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <span className="text-sm text-muted-foreground">{t('unsaved_changes', 'admin')}</span>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleDiscard} disabled={processing}>
                            {t('discard_changes', 'admin')}
                        </Button>
                        <Button type="button" className="btn-brand-primary" disabled={processing} onClick={() => formRef.current && formRef.current.requestSubmit()}>
                            {t('save', 'admin')}
                        </Button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
