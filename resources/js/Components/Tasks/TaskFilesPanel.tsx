import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { useConfirm } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { Task, TaskMediaItem } from '@/types';
import { router } from '@inertiajs/react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

export function TaskFilesPanel({
    task,
    canManage,
}: {
    task: Task;
    canManage: boolean;
}) {
    const { t } = useLocale('tasks');
    const { confirmDelete } = useConfirm();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const media = task.media ?? [];

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

    const remove = (m: TaskMediaItem) => {
        if (!canManage) {
            return;
        }
        confirmDelete(
            t('confirm_delete_attachment', undefined, { name: m.file_name })
        ).then((ok) => {
            if (ok) {
                router.delete(route('tasks.media.destroy', [task.id, m.id]), {
                    preserveScroll: true,
                });
            }
        });
    };

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                    <Label htmlFor="task_file_upload" className="flex items-center gap-2 cursor-pointer">
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

            {media.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('files_empty')}</p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {media.map((m) => (
                        <li
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm font-medium">{m.file_name}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button variant="ghost" size="icon" asChild>
                                    <a
                                        href={route('media.download', m.id)}
                                        download
                                        aria-label={t('action_download')}
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                                {canManage && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        aria-label={t('action_delete')}
                                        onClick={() => remove(m)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
