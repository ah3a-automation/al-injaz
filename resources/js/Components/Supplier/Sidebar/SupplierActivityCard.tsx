import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Activity, CheckCircle, Mail, FileText, Award } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface ActivityItem {
    id: string;
    label: string;
    date?: string | null;
    icon?: 'registered' | 'invited' | 'quoted' | 'awarded' | string;
}

interface SupplierActivityCardProps {
    items?: ActivityItem[];
}

const ICON_MAP = {
    registered: CheckCircle,
    invited: Mail,
    quoted: FileText,
    awarded: Award,
};

const COLOR_MAP: Record<string, string> = {
    registered: 'bg-green-500/15 text-green-600 dark:text-green-400',
    invited: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    quoted: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    awarded: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

function formatDate(s: string | null | undefined): string {
    if (!s) return '';
    try {
        return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return '';
    }
}

export default function SupplierActivityCard({ items = [] }: SupplierActivityCardProps) {
    const { t } = useLocale();
    const defaultItems: ActivityItem[] = [
        { id: '1', label: t('activity_registered', 'supplier_portal'), date: undefined, icon: 'registered' },
        { id: '2', label: t('activity_invited', 'supplier_portal'), date: undefined, icon: 'invited' },
        { id: '3', label: t('activity_quoted', 'supplier_portal'), date: undefined, icon: 'quoted' },
        { id: '4', label: t('activity_approved', 'supplier_portal'), date: undefined, icon: 'awarded' },
    ];
    const list = items.length > 0 ? items : defaultItems;

    return (
        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 px-4 py-2.5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    {t('profile_activity', 'supplier_portal')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <ul className="space-y-0">
                    {list.map((item, idx) => {
                        const iconKey = item.icon as keyof typeof ICON_MAP | undefined;
                        const Icon = iconKey && ICON_MAP[iconKey] ? ICON_MAP[iconKey] : CheckCircle;
                        const colorClass = (iconKey && COLOR_MAP[iconKey]) ? COLOR_MAP[iconKey] : 'bg-primary/10 text-primary';
                        return (
                            <li key={item.id} className="relative flex gap-2.5 pb-3 last:pb-0">
                                {idx < list.length - 1 && (
                                    <span className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                                )}
                                <span className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                                    <Icon className="h-3 w-3" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                                    {item.date && (
                                        <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}
