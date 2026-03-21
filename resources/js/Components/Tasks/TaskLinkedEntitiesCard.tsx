import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import {
    type TaskLinkTypeKey,
    linkableSummaryLabel,
    taskLinkHref,
    taskLinkTypeFromClass,
} from '@/lib/taskLinks';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';

function linkTypeLabel(t: (k: string) => string, typeKey: TaskLinkTypeKey): string {
    const keys: Record<TaskLinkTypeKey, string> = {
        project: 'link_type_project',
        supplier: 'link_type_supplier',
        rfq: 'link_type_rfq',
        package: 'link_type_package',
        contract: 'link_type_contract',
        purchase_request: 'link_type_purchase_request',
    };
    return t(keys[typeKey]);
}

export function TaskLinkedEntitiesCard({ task }: { task: Task }) {
    const { t } = useLocale('tasks');
    const links = task.links ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('section_related')}</CardTitle>
            </CardHeader>
            <CardContent>
                {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('links_empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {links.map((row) => {
                            const typeKey = taskLinkTypeFromClass(row.linkable_type);
                            const label =
                                typeKey != null ? linkTypeLabel(t, typeKey) : row.linkable_type;
                            const summary = linkableSummaryLabel(
                                row.linkable as Record<string, unknown> | undefined
                            );
                            const href =
                                typeKey != null
                                    ? taskLinkHref(
                                          typeKey,
                                          row.linkable_id,
                                          row.linkable as Record<string, unknown> | undefined
                                      )
                                    : null;
                            return (
                                <li
                                    key={row.id}
                                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {label}
                                        </p>
                                        <p className="truncate text-sm">{summary || row.linkable_id}</p>
                                    </div>
                                    {href ? (
                                        <Link
                                            href={href}
                                            className="shrink-0 text-primary hover:underline inline-flex items-center gap-1 text-sm"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            <span className="sr-only">{t('action_open')}</span>
                                        </Link>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
