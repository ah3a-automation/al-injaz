import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
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
}

interface TaskEntityLinksFieldsProps {
    links: TaskLinkFormRow[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, field: 'type' | 'id', value: string) => void;
}

export default function TaskEntityLinksFields({
    links,
    onAdd,
    onRemove,
    onChange,
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
            <p className="text-xs text-muted-foreground">{t('links_help')}</p>
            {links.map((row, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                    <select
                        value={row.type}
                        onChange={(e) => onChange(index, 'type', e.target.value)}
                        className={`${selectClass} min-w-[10rem] flex-1`}
                        aria-label={t('field_links')}
                    >
                        {TASK_LINK_TYPE_KEYS.map((k) => (
                            <option key={k} value={k}>
                                {t(LINK_TYPE_TO_I18N[k])}
                            </option>
                        ))}
                    </select>
                    <Input
                        value={row.id}
                        onChange={(e) => onChange(index, 'id', e.target.value)}
                        placeholder={t('link_id_placeholder')}
                        className="min-w-[8rem] flex-1"
                        autoComplete="off"
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
