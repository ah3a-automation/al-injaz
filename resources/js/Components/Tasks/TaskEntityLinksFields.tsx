import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { TaskLinkablePicker } from '@/Components/Tasks/TaskLinkablePicker';
import { useLocale } from '@/hooks/useLocale';
import { TASK_LINK_TYPE_KEYS, type TaskLinkTypeKey } from '@/lib/taskLinks';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

const LINK_TYPE_TO_I18N: Record<TaskLinkTypeKey, string> = {
    project: 'link_type_project',
    supplier: 'link_type_supplier',
    rfq: 'link_type_rfq',
    package: 'link_type_package',
    contract: 'link_type_contract',
    purchase_request: 'link_type_purchase_request',
};

const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export interface TaskLinkFormRow {
    type: TaskLinkTypeKey;
    id: string;
    label?: string;
}

interface TaskEntityLinksFieldsProps {
    links: TaskLinkFormRow[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChangeType: (index: number, value: TaskLinkTypeKey) => void;
    onPickLink: (index: number, id: string, label: string) => void;
    onClearLink: (index: number) => void;
}

export default function TaskEntityLinksFields({
    links,
    onAdd,
    onRemove,
    onChangeType,
    onPickLink,
    onClearLink,
}: TaskEntityLinksFieldsProps): ReactElement {
    const { t } = useLocale('tasks');

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <Label>{t('field_links')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}>
                    <Plus className="h-4 w-4" />
                    {t('link_add')}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('links_search_hint')}</p>
            {links.map((row, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                    <select
                        id={`task-link-type-${index}`}
                        value={row.type}
                        onChange={(e) =>
                            onChangeType(index, e.target.value as TaskLinkTypeKey)
                        }
                        className={`${selectClass} min-w-[10rem] flex-1`}
                        aria-label={`${t('field_links')} (${index + 1})`}
                    >
                        {TASK_LINK_TYPE_KEYS.map((k) => (
                            <option key={k} value={k}>
                                {t(LINK_TYPE_TO_I18N[k])}
                            </option>
                        ))}
                    </select>
                    <TaskLinkablePicker
                        linkType={row.type}
                        selectedId={row.id}
                        selectedLabel={row.label ?? ''}
                        onPick={(id, label) => onPickLink(index, id, label)}
                        onClear={() => onClearLink(index)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(index)}
                        aria-label={t('aria_remove_link')}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
        </div>
    );
}
