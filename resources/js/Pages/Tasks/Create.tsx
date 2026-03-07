import AppLayout from '@/Layouts/AppLayout';
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
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface CreateProps {
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: number; name: string }>;
    parentTasks: Array<{ id: string; title: string }>;
}

export default function Create({ projects, users, parentTasks }: CreateProps) {
    const { url } = usePage();
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const defaultParentId = params.get('parent_task_id') ?? '';

    const form = useForm({
        title: '',
        description: '',
        project_id: '',
        parent_task_id: defaultParentId,
        status: 'backlog',
        priority: 'normal',
        due_at: '',
        start_at: '',
        estimated_hours: '',
        progress_percent: 0,
        visibility: 'team',
        source: 'manual',
        assignees: [] as Array<{ user_id: string; role: string }>,
    });


    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            assignees: data.assignees.filter((a) => a.user_id),
        }));
        form.post(route('tasks.store'));
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

    const setAssignee = (index: number, field: 'user_id' | 'role', value: string) => {
        const next = [...form.data.assignees];
        next[index] = { ...next[index], [field]: value };
        form.setData('assignees', next);
    };

    return (
        <AppLayout>
            <Head title="Create Task" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Create Task</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('tasks.index')}>Cancel</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Task details</CardTitle>
                        <CardDescription>Add a new task.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    autoFocus
                                    required
                                    aria-invalid={!!form.errors.title}
                                />
                                {form.errors.title && (
                                    <p className="text-sm text-destructive">{form.errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-invalid={!!form.errors.description}
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-destructive">{form.errors.description}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="project_id">Project</Label>
                                    <select
                                        id="project_id"
                                        value={form.data.project_id}
                                        onChange={(e) => form.setData('project_id', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="">No project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.project_id && (
                                        <p className="text-sm text-destructive">{form.errors.project_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parent_task_id">Parent task</Label>
                                    <select
                                        id="parent_task_id"
                                        value={form.data.parent_task_id}
                                        onChange={(e) => form.setData('parent_task_id', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="">No parent</option>
                                        {parentTasks.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.title}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.parent_task_id && (
                                        <p className="text-sm text-destructive">{form.errors.parent_task_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="backlog">Backlog</option>
                                        <option value="open">Open</option>
                                        <option value="in_progress">In progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <select
                                        id="priority"
                                        value={form.data.priority}
                                        onChange={(e) => form.setData('priority', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="due_at">Due date</Label>
                                    <Input
                                        id="due_at"
                                        type="date"
                                        value={form.data.due_at}
                                        onChange={(e) => form.setData('due_at', e.target.value)}
                                        aria-invalid={!!form.errors.due_at}
                                    />
                                    {form.errors.due_at && (
                                        <p className="text-sm text-destructive">{form.errors.due_at}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="start_at">Start date</Label>
                                    <Input
                                        id="start_at"
                                        type="date"
                                        value={form.data.start_at}
                                        onChange={(e) => form.setData('start_at', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="estimated_hours">Estimated hours</Label>
                                    <Input
                                        id="estimated_hours"
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={form.data.estimated_hours}
                                        onChange={(e) => form.setData('estimated_hours', e.target.value)}
                                        aria-invalid={!!form.errors.estimated_hours}
                                    />
                                    {form.errors.estimated_hours && (
                                        <p className="text-sm text-destructive">{form.errors.estimated_hours}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="progress_percent">Progress %</Label>
                                    <Input
                                        id="progress_percent"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={form.data.progress_percent}
                                        onChange={(e) =>
                                            form.setData('progress_percent', Number(e.target.value) || 0)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="visibility">Visibility</Label>
                                <select
                                    id="visibility"
                                    value={form.data.visibility}
                                    onChange={(e) => form.setData('visibility', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="team">Team</option>
                                    <option value="project">Project</option>
                                    <option value="is_private">Private</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Assignees</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addAssignee}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Assignee
                                    </Button>
                                </div>
                                {form.data.assignees.map((a, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <select
                                            value={a.user_id}
                                            onChange={(e) => setAssignee(index, 'user_id', e.target.value)}
                                            className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            required
                                        >
                                            <option value="">Select user</option>
                                            {users.map((u) => (
                                                <option key={u.id} value={String(u.id)}>
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={a.role}
                                            onChange={(e) => setAssignee(index, 'role', e.target.value)}
                                            className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            <option value="responsible">Responsible</option>
                                            <option value="reviewer">Reviewer</option>
                                            <option value="watcher">Watcher</option>
                                        </select>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAssignee(index)}
                                            aria-label="Remove assignee"
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                {form.errors.assignees && (
                                    <p className="text-sm text-destructive">{form.errors.assignees}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={form.processing}>
                                    Create task
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('tasks.index')}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
