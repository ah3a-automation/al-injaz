import AppLayout from '@/Layouts/AppLayout';
import TaskEntityLinksFields, {
    type TaskLinkFormRow,
} from '@/Components/Tasks/TaskEntityLinksFields';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import {
    fromDatetimeLocalToIso,
    parseTagsInput,
    toDatetimeLocalValue,
} from '@/lib/taskFormUtils';
import { linkableSummaryLabel, taskLinkTypeFromClass } from '@/lib/taskLinks';
import type { Task } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface EditProps {
    task: Task;
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: number; name: string }>;
    parentTasks: Array<{ id: string; title: string }>;
}

const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function initialLinks(task: Task): TaskLinkFormRow[] {
    if (!task.links?.length) {
        return [];
    }
    return task.links.map((row) => {
        const type = taskLinkTypeFromClass(row.linkable_type);
        const label = linkableSummaryLabel(
            row.linkable as Record<string, unknown> | undefined
        );
        return {
            type: type ?? 'project',
            id: row.linkable_id,
            label,
        };
    });
}

export default function Edit({ task, projects, users, parentTasks }: EditProps) {
    const { t } = useLocale('tasks');

    const form = useForm({
        title: task.title,
        description: task.description ?? '',
        project_id: task.project_id ?? '',
        parent_task_id: task.parent_task_id ?? '',
        status: task.status,
        priority: task.priority,
        due_at: task.due_at ? task.due_at.substring(0, 10) : '',
        start_at: task.start_at ? task.start_at.substring(0, 10) : '',
        estimated_hours: task.estimated_hours ?? '',
        progress_percent: task.progress_percent,
        visibility: task.visibility,
        source: task.source,
        tags_input: task.tags?.join(', ') ?? '',
        reminder_at: toDatetimeLocalValue(task.reminder_at),
        links: initialLinks(task),
        assignees:
            task.assignees?.map((a) => ({
                user_id: String(a.id),
                role: a.pivot.role,
            })) ?? [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => {
            const tagList = parseTagsInput(data.tags_input);
            const linksClean = data.links
                .filter((l) => l.id.trim() !== '')
                .map((l) => ({ type: l.type, id: l.id.trim() }));
            const reminderIso =
                data.reminder_at.trim() === ''
                    ? null
                    : fromDatetimeLocalToIso(data.reminder_at) ?? null;
            return {
                title: data.title,
                description: data.description || null,
                project_id: data.project_id || null,
                parent_task_id: data.parent_task_id || null,
                status: data.status,
                priority: data.priority,
                due_at: data.due_at || null,
                start_at: data.start_at || null,
                estimated_hours:
                    data.estimated_hours === '' ? null : Number(data.estimated_hours),
                progress_percent: data.progress_percent,
                visibility: data.visibility,
                source: data.source,
                tags: tagList,
                reminder_at: reminderIso,
                links: linksClean,
                assignees: data.assignees.filter((a) => a.user_id),
            };
        });
        form.patch(route('tasks.update', task.id));
    };

    const addAssignee = () => {
        form.setData('assignees', [
            ...form.data.assignees,
            { user_id: '', role: 'responsible' },
        ]);
    };

    const removeAssignee = (index: number) => {
        form.setData(
            'assignees',
            form.data.assignees.filter((_, i) => i !== index)
        );
    };

    const setAssignee = (
        index: number,
        field: 'user_id' | 'role',
        value: string
    ) => {
        const next = [...form.data.assignees];
        next[index] = { ...next[index], [field]: value };
        form.setData('assignees', next);
    };

    const addLink = () => {
        form.setData('links', [
            ...form.data.links,
            { type: 'project', id: '', label: '' },
        ]);
    };

    const removeLink = (index: number) => {
        form.setData(
            'links',
            form.data.links.filter((_, i) => i !== index)
        );
    };

    const changeLinkType = (index: number, value: TaskLinkFormRow['type']) => {
        const next = [...form.data.links];
        next[index] = { ...next[index], type: value, id: '', label: '' };
        form.setData('links', next);
    };

    const pickLink = (index: number, id: string, label: string) => {
        const next = [...form.data.links];
        next[index] = { ...next[index], id, label };
        form.setData('links', next);
    };

    const clearLink = (index: number) => {
        const next = [...form.data.links];
        next[index] = { ...next[index], id: '', label: '' };
        form.setData('links', next);
    };

    const pageTitle = t('page_title_edit', 'tasks', { title: task.title });

    return (
        <AppLayout>
            <Head title={pageTitle} />

            <div className="w-full min-w-0 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('title_edit')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('tasks.show', task.id)}>
                            {t('action_cancel')}
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('section_details')}</CardTitle>
                        <CardDescription>{t('form_edit_description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('field_title')}</Label>
                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(e) =>
                                        form.setData('title', e.target.value)
                                    }
                                    required
                                    aria-invalid={!!form.errors.title}
                                />
                                {form.errors.title && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    {t('field_description')}
                                </Label>
                                <textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData('description', e.target.value)
                                    }
                                    rows={3}
                                    className={textareaClass}
                                    aria-invalid={!!form.errors.description}
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="project_id">
                                        {t('field_project')}
                                    </Label>
                                    <select
                                        id="project_id"
                                        value={form.data.project_id}
                                        onChange={(e) =>
                                            form.setData('project_id', e.target.value)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="">{t('field_no_project')}</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parent_task_id">
                                        {t('field_parent_task')}
                                    </Label>
                                    <select
                                        id="parent_task_id"
                                        value={form.data.parent_task_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'parent_task_id',
                                                e.target.value
                                            )
                                        }
                                        className={selectClass}
                                    >
                                        <option value="">{t('field_no_parent')}</option>
                                        {parentTasks
                                            .filter((pt) => pt.id !== task.id)
                                            .map((pt) => (
                                                <option key={pt.id} value={pt.id}>
                                                    {pt.title}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="status">{t('field_status')}</Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(e) =>
                                            form.setData(
                                                'status',
                                                e.target.value as Task['status']
                                            )
                                        }
                                        className={selectClass}
                                    >
                                        <option value="backlog">
                                            {t('status_backlog')}
                                        </option>
                                        <option value="open">{t('status_open')}</option>
                                        <option value="in_progress">
                                            {t('status_in_progress')}
                                        </option>
                                        <option value="review">
                                            {t('status_review')}
                                        </option>
                                        <option value="done">{t('status_done')}</option>
                                        <option value="cancelled">
                                            {t('status_cancelled')}
                                        </option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority">
                                        {t('field_priority')}
                                    </Label>
                                    <select
                                        id="priority"
                                        value={form.data.priority}
                                        onChange={(e) =>
                                            form.setData(
                                                'priority',
                                                e.target.value as Task['priority']
                                            )
                                        }
                                        className={selectClass}
                                    >
                                        <option value="low">
                                            {t('priority_low')}
                                        </option>
                                        <option value="normal">
                                            {t('priority_normal')}
                                        </option>
                                        <option value="high">
                                            {t('priority_high')}
                                        </option>
                                        <option value="urgent">
                                            {t('priority_urgent')}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="source">{t('field_source')}</Label>
                                    <select
                                        id="source"
                                        value={form.data.source}
                                        onChange={(e) =>
                                            form.setData('source', e.target.value)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="manual">
                                            {t('source_manual')}
                                        </option>
                                        <option value="rfq">{t('source_rfq')}</option>
                                        <option value="contract">
                                            {t('source_contract')}
                                        </option>
                                        <option value="system">
                                            {t('source_system')}
                                        </option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visibility">
                                        {t('field_visibility')}
                                    </Label>
                                    <select
                                        id="visibility"
                                        value={form.data.visibility}
                                        onChange={(e) =>
                                            form.setData('visibility', e.target.value)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="team">
                                            {t('visibility_team')}
                                        </option>
                                        <option value="project">
                                            {t('visibility_project')}
                                        </option>
                                        <option value="is_private">
                                            {t('visibility_private')}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="due_at">{t('field_due_date')}</Label>
                                    <Input
                                        id="due_at"
                                        type="date"
                                        value={form.data.due_at}
                                        onChange={(e) =>
                                            form.setData('due_at', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="start_at">
                                        {t('field_start_date')}
                                    </Label>
                                    <Input
                                        id="start_at"
                                        type="date"
                                        value={form.data.start_at}
                                        onChange={(e) =>
                                            form.setData('start_at', e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="reminder_at">
                                        {t('field_reminder_at')}
                                    </Label>
                                    <Input
                                        id="reminder_at"
                                        type="datetime-local"
                                        value={form.data.reminder_at}
                                        onChange={(e) =>
                                            form.setData('reminder_at', e.target.value)
                                        }
                                        aria-invalid={!!form.errors.reminder_at}
                                    />
                                    {form.errors.reminder_at && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.reminder_at}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tags_input">
                                        {t('field_tags')}
                                    </Label>
                                    <Input
                                        id="tags_input"
                                        value={form.data.tags_input}
                                        onChange={(e) =>
                                            form.setData('tags_input', e.target.value)
                                        }
                                        aria-invalid={
                                            !!(form.errors as Record<string, string | undefined>)
                                                .tags
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('tags_placeholder')}
                                    </p>
                                    {(form.errors as Record<string, string | undefined>).tags && (
                                        <p className="text-sm text-destructive">
                                            {(form.errors as Record<string, string>).tags}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="estimated_hours">
                                        {t('field_estimated_hours')}
                                    </Label>
                                    <Input
                                        id="estimated_hours"
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={form.data.estimated_hours}
                                        onChange={(e) =>
                                            form.setData(
                                                'estimated_hours',
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="progress_percent">
                                        {t('field_progress_percent')}
                                    </Label>
                                    <Input
                                        id="progress_percent"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={form.data.progress_percent}
                                        onChange={(e) =>
                                            form.setData(
                                                'progress_percent',
                                                Number(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <TaskEntityLinksFields
                                links={form.data.links}
                                onAdd={addLink}
                                onRemove={removeLink}
                                onChangeType={changeLinkType}
                                onPickLink={pickLink}
                                onClearLink={clearLink}
                            />
                            {typeof form.errors.links === 'string' && (
                                <p className="text-sm text-destructive">
                                    {form.errors.links}
                                </p>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label>{t('field_assignee')}</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addAssignee}
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('action_assign')}
                                    </Button>
                                </div>
                                {form.data.assignees.map((a, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-wrap items-center gap-2"
                                    >
                                        <select
                                            value={a.user_id}
                                            onChange={(e) =>
                                                setAssignee(
                                                    index,
                                                    'user_id',
                                                    e.target.value
                                                )
                                            }
                                            className={`${selectClass} min-w-0 flex-1`}
                                            required
                                        >
                                            <option value="">{t('select_user')}</option>
                                            {users.map((u) => (
                                                <option
                                                    key={u.id}
                                                    value={String(u.id)}
                                                >
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={a.role}
                                            onChange={(e) =>
                                                setAssignee(
                                                    index,
                                                    'role',
                                                    e.target.value
                                                )
                                            }
                                            className={`${selectClass} w-full sm:w-32`}
                                        >
                                            <option value="responsible">
                                                {t('role_responsible')}
                                            </option>
                                            <option value="reviewer">
                                                {t('role_reviewer')}
                                            </option>
                                            <option value="watcher">
                                                {t('role_watcher')}
                                            </option>
                                        </select>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAssignee(index)}
                                            aria-label={t('aria_remove_assignee')}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4">
                                <Button type="submit" disabled={form.processing}>
                                    {t('action_save')}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('tasks.show', task.id)}>
                                        {t('action_cancel')}
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
