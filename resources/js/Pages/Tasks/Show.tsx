import AppLayout from '@/Layouts/AppLayout';
import { TaskCard } from '@/Components/Tasks';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import type { Task, TaskComment } from '@/types';
import type { SharedPageProps } from '@/types';
import { useConfirm } from '@/hooks';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { isOverdue } from '@/utils/tasks';

interface ShowProps {
    task: Task;
    can: { update: boolean; delete: boolean };
}

const statusClass: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-700',
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    review: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const priorityClass: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
};

export default function Show({ task, can }: ShowProps) {
    const { confirmDelete } = useConfirm();
    const { auth } = usePage().props as SharedPageProps;
    const currentUserId = auth.user?.id ?? null;

    const [commentBody, setCommentBody] = useState('');

    const handleDeleteTask = () => {
        confirmDelete(`Delete task "${task.title}"?`).then((confirmed) => {
            if (confirmed) {
                router.delete(route('tasks.destroy', task.id));
                router.visit('/tasks');
            }
        });
    };

    const comments = task.comments ?? [];
    const subtasks = task.subtasks ?? [];
    const assignees = task.assignees ?? [];
    const overdue = isOverdue(task);

    return (
        <AppLayout>
            <Head title={task.title} />

            <div className="space-y-6 p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left column — col-span-2 */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[task.status] ?? statusClass.backlog}`}
                                >
                                    {task.status}
                                </span>
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[task.priority] ?? priorityClass.normal}`}
                                >
                                    {task.priority}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {can.update && (
                                    <Button asChild>
                                        <Link href={route('tasks.edit', task.id)}>
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                        </Link>
                                    </Button>
                                )}
                                {can.delete && (
                                    <Button variant="destructive" onClick={handleDeleteTask}>
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>

                        {/* Description */}
                        <div>
                            <Label className="text-muted-foreground">Description</Label>
                            <p className="mt-1 whitespace-pre-wrap">
                                {task.description ?? 'No description provided.'}
                            </p>
                        </div>

                        {/* Progress */}
                        <div>
                            <Label className="text-muted-foreground">Progress</Label>
                            <p className="mt-1 text-sm">{task.progress_percent}%</p>
                            <div className="mt-1 w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${task.progress_percent}%` }}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap gap-4 text-sm">
                            {task.due_at && (
                                <span className={overdue ? 'text-red-600 font-medium' : ''}>
                                    Due: {new Date(task.due_at).toLocaleDateString()}
                                </span>
                            )}
                            {task.start_at && (
                                <span>Start: {new Date(task.start_at).toLocaleDateString()}</span>
                            )}
                            {task.completed_at && (
                                <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                            )}
                        </div>

                        {/* Hours */}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Estimated: {task.estimated_hours ?? '—'} h</span>
                            <span>Actual: {task.actual_hours ?? '—'} h</span>
                        </div>

                        {/* Subtasks */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    <CardTitle>Subtasks</CardTitle>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                        {subtasks.length}
                                    </span>
                                </div>
                                <Button size="sm" asChild>
                                    <Link href={`${route('tasks.create')}?parent_task_id=${task.id}`}>
                                        Add subtask
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {subtasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No subtasks yet.</p>
                                ) : (
                                    subtasks.map((st) => (
                                        <div
                                            key={st.id}
                                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2"
                                        >
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[st.status] ?? ''}`}
                                            >
                                                {st.status}
                                            </span>
                                            <Link
                                                href={route('tasks.show', st.id)}
                                                className="min-w-0 flex-1 truncate font-medium hover:underline"
                                            >
                                                {st.title}
                                            </Link>
                                            {st.assignees && st.assignees.length > 0 && (
                                                <div className="flex -space-x-2 shrink-0">
                                                    {st.assignees.slice(0, 3).map((a) => (
                                                        <div
                                                            key={a.id}
                                                            className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium border border-background"
                                                            title={a.name}
                                                        >
                                                            {a.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Comments */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Comments</CardTitle>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                    {comments.length}
                                </span>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No comments yet. Be the first to comment.
                                    </p>
                                ) : (
                                    <ul className="space-y-3">
                                        {comments.map((comment: TaskComment) => (
                                            <li
                                                key={comment.id}
                                                className="flex gap-3 rounded-md border border-border bg-muted/30 p-3"
                                            >
                                                <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-medium border border-background">
                                                    {comment.user?.name?.charAt(0).toUpperCase() ?? '?'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-sm">
                                                            {comment.user?.name ?? 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(comment.created_at).toLocaleString()}
                                                        </span>
                                                        {currentUserId === comment.user_id && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive h-8"
                                                                onClick={() => {
                                                                    router.delete(
                                                                        route('tasks.comments.destroy', [
                                                                            task.id,
                                                                            comment.id,
                                                                        ])
                                                                    );
                                                                }}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-sm whitespace-pre-wrap">
                                                        {comment.body}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <form
                                    className="pt-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (!commentBody.trim()) return;
                                        router.post(
                                            route('tasks.comments.store', task.id),
                                            { body: commentBody },
                                            {
                                                onSuccess: () => setCommentBody(''),
                                            }
                                        );
                                    }}
                                >
                                    <Label htmlFor="comment_body" className="sr-only">
                                        Add comment
                                    </Label>
                                    <textarea
                                        id="comment_body"
                                        value={commentBody}
                                        onChange={(e) => setCommentBody(e.target.value)}
                                        placeholder="Write a comment..."
                                        rows={3}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    <Button type="submit" size="sm" className="mt-2">
                                        Submit
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right column — meta + assignees */}
                    <div className="space-y-4 lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Project: </span>
                                    {task.project ? (
                                        <Link
                                            href={route('projects.show', task.project.id)}
                                            className="hover:underline"
                                        >
                                            {task.project.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Creator: </span>
                                    {task.creator?.name ?? '—'}
                                </div>
                                <div>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[task.visibility] ?? 'bg-muted'}`}
                                    >
                                        {task.visibility}
                                    </span>
                                </div>
                                <div>
                                    <span
                                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted"
                                    >
                                        {task.source}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Created: </span>
                                    {new Date(task.created_at).toLocaleString()}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Updated: </span>
                                    {new Date(task.updated_at).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Assignees</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {assignees.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No assignees.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {assignees.map((a) => (
                                            <li
                                                key={a.id}
                                                className="flex items-center gap-2"
                                            >
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border border-background">
                                                    {a.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm">{a.name}</span>
                                                <span
                                                    className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted`}
                                                >
                                                    {a.pivot.role}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
