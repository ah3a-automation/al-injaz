import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { TaskLinkablePicker } from '@/Components/Tasks/TaskLinkablePicker';
import {
    type TaskLinkTypeKey,
    TASK_LINK_TYPE_KEYS,
    linkableSummaryLabel,
    taskLinkHref,
    taskLinkTypeFromClass,
} from '@/lib/taskLinks';
import { useLocale } from '@/hooks/useLocale';
import type { Task } from '@/types';
import { Link, router } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    ClipboardList,
    ExternalLink,
    FileText,
    FolderKanban,
    Package,
    Plus,
} from 'lucide-react';
import { useState, type ReactElement } from 'react';

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

function linkTypeIcon(typeKey: TaskLinkTypeKey | null) {
    const map: Record<TaskLinkTypeKey, typeof FolderKanban> = {
        project: FolderKanban,
        supplier: Building2,
        rfq: Briefcase,
        package: Package,
        contract: FileText,
        purchase_request: ClipboardList,
    };
    return typeKey ? map[typeKey] : FileText;
}

const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface TaskLinkedEntitiesCardProps {
    task: Task;
    canManage?: boolean;
}

export function TaskLinkedEntitiesCard({
    task,
    canManage = false,
}: TaskLinkedEntitiesCardProps): ReactElement {
    const { t } = useLocale('tasks');
    const links = task.links ?? [];

    const [showAdd, setShowAdd] = useState(false);
    const [linkType, setLinkType] = useState<TaskLinkTypeKey>('project');
    const [linkId, setLinkId] = useState('');
    const [linkLabel, setLinkLabel] = useState('');

    const openAdd = () => {
        setLinkType('project');
        setLinkId('');
        setLinkLabel('');
        setShowAdd(true);
    };

    const closeAdd = () => {
        setShowAdd(false);
    };

    const submitAdd = () => {
        if (!linkId.trim()) {
            return;
        }
        router.post(
            route('tasks.links.store', task.id),
            { type: linkType, id: linkId.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    closeAdd();
                },
            }
        );
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-base">{t('section_related')}</CardTitle>
                    {canManage && (
                        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4" />
                            {t('link_add')}
                        </Button>
                    )}
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
                                const Icon = linkTypeIcon(typeKey);
                                return (
                                    <li
                                        key={row.id}
                                        className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                                    >
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
                                                <Icon className="h-4 w-4" aria-hidden />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {label}
                                                </p>
                                                <p className="truncate text-sm font-medium">
                                                    {summary || row.linkable_id}
                                                </p>
                                            </div>
                                        </div>
                                        {href ? (
                                            <Link
                                                href={href}
                                                className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
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

            <Modal show={showAdd} onClose={closeAdd} maxWidth="md">
                <div className="space-y-4 p-1">
                    <h3 className="text-lg font-semibold">{t('link_add_dialog_title')}</h3>
                    <div className="space-y-2">
                        <label htmlFor="task-link-type" className="text-sm font-medium">
                            {t('field_links')}
                        </label>
                        <select
                            id="task-link-type"
                            value={linkType}
                            onChange={(e) => {
                                setLinkType(e.target.value as TaskLinkTypeKey);
                                setLinkId('');
                                setLinkLabel('');
                            }}
                            className={selectClass}
                        >
                            {TASK_LINK_TYPE_KEYS.map((k) => (
                                <option key={k} value={k}>
                                    {linkTypeLabel(t, k)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t('links_search_hint')}</p>
                        <TaskLinkablePicker
                            linkType={linkType}
                            selectedId={linkId}
                            selectedLabel={linkLabel}
                            onPick={(id, label) => {
                                setLinkId(id);
                                setLinkLabel(label);
                            }}
                            onClear={() => {
                                setLinkId('');
                                setLinkLabel('');
                            }}
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" onClick={closeAdd}>
                            {t('action_cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={submitAdd}
                            disabled={!linkId.trim()}
                        >
                            {t('link_submit_add')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
