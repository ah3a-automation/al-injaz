import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import type { Task, TaskComment } from '@/types';
import { router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Download, FileText, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

export function TaskCommentsPanel({
    task,
    currentUserId,
    canInteract,
}: {
    task: Task;
    currentUserId: number | null;
    canInteract: boolean;
}) {
    const { t, locale } = useLocale('tasks');
    const dateLocale = locale === 'ar' ? ar : enUS;
    const comments = task.comments ?? [];

    const [body, setBody] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);

    const sorted = useMemo(
        () => [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
        [comments]
    );

    const submit = () => {
        if (!canInteract || !body.trim()) {
            return;
        }
        setBusy(true);
        const fd = new FormData();
        fd.append('body', body.trim());
        if (reminderAt) {
            fd.append('reminder_at', reminderAt);
        }
        files.forEach((f) => fd.append('files[]', f));
        router.post(route('tasks.comments.store', task.id), fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setBody('');
                setReminderAt('');
                setFiles([]);
            },
        });
    };

    return (
        <div className="space-y-6">
            <ul className="space-y-4">
                {sorted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('no_comments')}</p>
                ) : (
                    sorted.map((comment: TaskComment) => (
                        <li
                            key={comment.id}
                            className="rounded-lg border border-border bg-card p-4 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium"
                                        aria-hidden
                                    >
                                        {comment.user?.name?.charAt(0).toUpperCase() ?? '?'}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="font-medium text-sm">
                                                {comment.user?.name ?? t('comment_unknown_user')}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(comment.created_at), {
                                                    addSuffix: true,
                                                    locale: dateLocale,
                                                })}
                                            </span>
                                        </div>
                                        {comment.reminder_at && (
                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                {t('comment_reminder_set')}:{' '}
                                                {new Date(comment.reminder_at).toLocaleString(
                                                    locale === 'ar' ? 'ar-SA' : undefined
                                                )}
                                            </p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap wrap-break-word">
                                            {comment.body}
                                        </p>
                                        {comment.media && comment.media.length > 0 && (
                                            <ul className="mt-2 flex flex-wrap gap-2">
                                                {comment.media.map((m) => (
                                                    <li key={m.id}>
                                                        <a
                                                            href={route('media.download', m.id)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
                                                        >
                                                            <FileText className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate max-w-[12rem]">
                                                                {m.file_name}
                                                            </span>
                                                            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                {currentUserId === comment.user_id && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive shrink-0"
                                        aria-label={t('action_delete')}
                                        onClick={() => {
                                            router.delete(
                                                route('tasks.comments.destroy', [task.id, comment.id]),
                                                { preserveScroll: true }
                                            );
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))
                )}
            </ul>

            {canInteract ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                    <Label htmlFor="task_comment_body" className="text-base">
                        {t('section_comments')}
                    </Label>
                    <textarea
                        id="task_comment_body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        placeholder={t('comment_placeholder')}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="comment_reminder_at" className="text-xs font-normal">
                                {t('field_comment_reminder')}
                            </Label>
                            <input
                                id="comment_reminder_at"
                                type="datetime-local"
                                value={reminderAt}
                                onChange={(e) => setReminderAt(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="comment_files" className="text-xs font-normal">
                                {t('field_attachments')}
                            </Label>
                            <input
                                id="comment_files"
                                type="file"
                                multiple
                                onChange={(e) =>
                                    setFiles(e.target.files ? Array.from(e.target.files) : [])
                                }
                                className="block w-full text-sm text-muted-foreground file:me-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
                            />
                        </div>
                    </div>
                    <Button type="button" onClick={submit} disabled={busy || !body.trim()}>
                        {t('comment_post')}
                    </Button>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t('comments_readonly')}</p>
            )}
        </div>
    );
}
