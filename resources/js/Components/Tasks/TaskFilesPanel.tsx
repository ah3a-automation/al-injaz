import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { useConfirm } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { Task, TaskMediaItem } from '@/types';
import { router } from '@inertiajs/react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

function formatFileSize(bytes: number | null): string {
    if (bytes == null || bytes < 0) {
        return '—';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    }
    const mb = kb / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

interface AggregatedFileRow {
    key: string;
    media: TaskMediaItem;
    source: 'task' | 'comment';
    commentId?: string;
    commentUserName?: string;
    /** Comment `created_at` when source is comment (fallback for sort/display) */
    commentCreatedAt?: string;
    sortKey: string;
}

function aggregateTaskFiles(task: Task): AggregatedFileRow[] {
    const seen = new Set<number>();
    const rows: AggregatedFileRow[] = [];

    for (const m of task.media ?? []) {
        if (!seen.has(m.id)) {
            seen.add(m.id);
            const ts = m.created_at ?? '';
            rows.push({
                key: `task-${m.id}`,
                media: m,
                source: 'task',
                sortKey: ts,
            });
        }
    }

    for (const c of task.comments ?? []) {
        for (const m of c.media ?? []) {
            if (!seen.has(m.id)) {
                seen.add(m.id);
                const ts = m.created_at ?? c.created_at ?? '';
                rows.push({
                    key: `comment-${c.id}-${m.id}`,
                    media: m,
                    source: 'comment',
                    commentId: c.id,
                    commentUserName: c.user?.name,
                    commentCreatedAt: c.created_at,
                    sortKey: ts,
                });
            }
        }
    }

    rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return rows;
}

export function TaskFilesPanel({
    task,
    canManage,
}: {
    task: Task;
    canManage: boolean;
}) {
    const { t, locale } = useLocale('tasks');
    const { confirmDelete } = useConfirm();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const rows = useMemo(() => aggregateTaskFiles(task), [task]);

    const upload = (file: File) => {
        if (!canManage) {
            return;
        }
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        router.post(route('tasks.media.store', task.id), fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
        });
    };

    const remove = (row: AggregatedFileRow) => {
        if (!canManage) {
            return;
        }
        confirmDelete(
            t('confirm_delete_attachment', undefined, { name: row.media.file_name })
        ).then((ok) => {
            if (!ok) {
                return;
            }
            if (row.source === 'task') {
                router.delete(route('tasks.media.destroy', [task.id, row.media.id]), {
                    preserveScroll: true,
                });
            } else if (row.commentId) {
                router.delete(
                    route('tasks.comments.media.destroy', [
                        task.id,
                        row.commentId,
                        row.media.id,
                    ]),
                    { preserveScroll: true }
                );
            }
        });
    };

    const formatUploadedAt = (row: AggregatedFileRow): string | null => {
        const raw =
            row.media.created_at ??
            (row.source === 'comment' ? row.commentCreatedAt : undefined);
        if (!raw) {
            return null;
        }
        try {
            return new Date(raw).toLocaleString(
                locale === 'ar' ? 'ar-SA' : undefined,
                { dateStyle: 'short', timeStyle: 'short' }
            );
        } catch {
            return null;
        }
    };

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                    <Label htmlFor="task_file_upload" className="flex cursor-pointer items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {t('files_upload_label')}
                    </Label>
                    <input
                        ref={inputRef}
                        id="task_file_upload"
                        type="file"
                        className="sr-only"
                        disabled={uploading}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                                upload(f);
                            }
                            e.target.value = '';
                        }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{t('files_upload_hint')}</p>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {t('files_choose_file')}
                    </Button>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('files_empty')}</p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {rows.map((row) => {
                        const uploaded = formatUploadedAt(row);
                        const sourceLabel =
                            row.source === 'task'
                                ? t('files_source_task')
                                : t('files_source_comment_user', undefined, {
                                      name: row.commentUserName ?? t('comment_unknown_user'),
                                  });
                        return (
                            <li
                                key={row.key}
                                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                        <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{row.media.file_name}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center rounded-md bg-muted/80 px-1.5 py-0.5 font-medium text-foreground/90">
                                                {sourceLabel}
                                            </span>
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                            {row.media.mime_type ? (
                                                <span className="truncate">{row.media.mime_type}</span>
                                            ) : null}
                                            <span className="tabular-nums">
                                                {t('files_size')}: {formatFileSize(row.media.size)}
                                            </span>
                                            {uploaded ? (
                                                <span className="tabular-nums">
                                                    {t('files_uploaded_at')}: {uploaded}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button variant="ghost" size="icon" asChild>
                                        <a
                                            href={route('media.download', row.media.id)}
                                            download
                                            aria-label={t('action_download')}
                                        >
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    {canManage &&
                                        (row.source === 'task' ||
                                            (row.source === 'comment' && row.commentId)) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                aria-label={t('action_delete')}
                                                onClick={() => remove(row)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
