import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/useLocale';
import type { Task, TaskComment } from '@/types';
import { router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Download, FileText, Send, Trash2 } from 'lucide-react';
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
        <div className="flex min-h-[min(70vh,560px)] flex-col gap-0">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-1 pb-4">
                {sorted.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        {t('no_comments')}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {sorted.map((comment: TaskComment) => {
                            const mine = currentUserId === comment.user_id;
                            return (
                                <li
                                    key={comment.id}
                                    className={cn(
                                        'flex w-full gap-3',
                                        mine ? 'flex-row-reverse' : 'flex-row'
                                    )}
                                >
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground shadow-sm"
                                        aria-hidden
                                    >
                                        {comment.user?.name?.charAt(0).toUpperCase() ?? '?'}
                                    </div>
                                    <div
                                        className={cn(
                                            'min-w-0 max-w-[min(100%,28rem)] rounded-2xl border px-4 py-3 shadow-sm',
                                            mine
                                                ? 'rounded-se-md border-primary/25 bg-primary/10'
                                                : 'rounded-ss-md border-border bg-muted/40'
                                        )}
                                    >
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                                            <span className="text-sm font-semibold">
                                                {comment.user?.name ?? t('comment_unknown_user')}
                                            </span>
                                            <time
                                                className="text-[11px] text-muted-foreground tabular-nums"
                                                dateTime={comment.created_at}
                                            >
                                                {formatDistanceToNow(new Date(comment.created_at), {
                                                    addSuffix: true,
                                                    locale: dateLocale,
                                                })}
                                            </time>
                                        </div>
                                        {comment.reminder_at && (
                                            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                                                {t('comment_reminder_set')}:{' '}
                                                {new Date(comment.reminder_at).toLocaleString(
                                                    locale === 'ar' ? 'ar-SA' : undefined
                                                )}
                                            </p>
                                        )}
                                        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                                            {comment.body}
                                        </p>
                                        {comment.media && comment.media.length > 0 && (
                                            <ul className="mt-3 flex flex-wrap gap-2">
                                                {comment.media.map((m) => (
                                                    <li key={m.id}>
                                                        <a
                                                            href={route('media.download', m.id)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
                                                        >
                                                            <FileText className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="max-w-[12rem] truncate">
                                                                {m.file_name}
                                                            </span>
                                                            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {mine && (
                                            <div className="mt-2 flex justify-end border-t border-border/40 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-destructive hover:text-destructive"
                                                    aria-label={t('action_delete')}
                                                    onClick={() => {
                                                        router.delete(
                                                            route('tasks.comments.destroy', [
                                                                task.id,
                                                                comment.id,
                                                            ]),
                                                            { preserveScroll: true }
                                                        );
                                                    }}
                                                >
                                                    <Trash2 className="me-1 h-3.5 w-3.5" />
                                                    {t('action_delete')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {canInteract ? (
                <div className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-card/95 px-1 pb-1 pt-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
                        <Label htmlFor="task_comment_body" className="text-sm font-medium">
                            {t('section_comments')}
                        </Label>
                        <textarea
                            id="task_comment_body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={3}
                            placeholder={t('comment_placeholder')}
                            className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="comment_reminder_at"
                                    className="text-xs font-normal text-muted-foreground"
                                >
                                    {t('field_comment_reminder')}
                                </Label>
                                <Input
                                    id="comment_reminder_at"
                                    type="datetime-local"
                                    value={reminderAt}
                                    onChange={(e) => setReminderAt(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="comment_files"
                                    className="text-xs font-normal text-muted-foreground"
                                >
                                    {t('field_attachments')}
                                </Label>
                                <Input
                                    id="comment_files"
                                    type="file"
                                    multiple
                                    onChange={(e) =>
                                        setFiles(e.target.files ? Array.from(e.target.files) : [])
                                    }
                                    className="h-9 cursor-pointer text-sm text-muted-foreground file:me-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                onClick={submit}
                                disabled={busy || !body.trim()}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" aria-hidden />
                                {t('comment_post')}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                    {t('comments_readonly')}
                </p>
            )}
        </div>
    );
}
