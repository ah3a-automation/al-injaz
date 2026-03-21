import AppLayout from '@/Layouts/AppLayout';
import { TaskActivityTimeline } from '@/Components/Tasks/TaskActivityTimeline';
import { TaskAssigneesCard } from '@/Components/Tasks/TaskAssigneesCard';
import { TaskCommentsPanel } from '@/Components/Tasks/TaskCommentsPanel';
import { TaskDetailsTab } from '@/Components/Tasks/TaskDetailsTab';
import { TaskFilesPanel } from '@/Components/Tasks/TaskFilesPanel';
import { TaskLinkedEntitiesCard } from '@/Components/Tasks/TaskLinkedEntitiesCard';
import { TaskMetaCard } from '@/Components/Tasks/TaskMetaCard';
import { TaskPageHeader } from '@/Components/Tasks/TaskPageHeader';
import { TaskRemindersCard } from '@/Components/Tasks/TaskRemindersCard';
import { TaskSubtasksPanel } from '@/Components/Tasks/TaskSubtasksPanel';
import { Button } from '@/Components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useConfirm } from '@/hooks';
import { useLocale } from '@/hooks/useLocale';
import type { SharedPageProps, Task, TaskHistoryEntry } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

interface ShowProps {
    task: Task;
    can: { update: boolean; delete: boolean };
    history?: TaskHistoryEntry[];
}

export default function Show({ task, can, history }: ShowProps) {
    const { confirmDelete } = useConfirm();
    const { t } = useLocale('tasks');
    const { auth } = usePage().props as SharedPageProps;
    const currentUserId = auth.user?.id ?? null;

    const handleDeleteTask = () => {
        confirmDelete(t('confirm_delete_body', undefined, { title: task.title })).then(
            (confirmed) => {
                if (confirmed) {
                    router.delete(route('tasks.destroy', task.id));
                }
            }
        );
    };

    const handleBack = useCallback(() => {
        if (typeof document !== 'undefined' && document.referrer) {
            router.visit(document.referrer);
            return;
        }
        router.visit(route('tasks.index'));
    }, []);

    const project = task.project;
    const projectName = project?.name?.trim() ?? '';
    const showProjectCrumb = Boolean(project?.id && projectName);

    return (
        <AppLayout>
            <Head title={task.title} />

            <div className="w-full min-w-0 space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('aria_back')}
                    >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                    </button>
                    <nav
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
                        aria-label={t('breadcrumb_aria')}
                        dir="ltr"
                    >
                        <Link
                            href={route('tasks.index')}
                            className="shrink-0 hover:text-foreground"
                        >
                            {t('title_index')}
                        </Link>
                        {showProjectCrumb && project && (
                            <>
                                <span className="text-muted-foreground/70" aria-hidden>
                                    /
                                </span>
                                <Link
                                    href={route('projects.show', project.id)}
                                    className="min-w-0 truncate hover:text-foreground"
                                    dir="auto"
                                >
                                    {projectName}
                                </Link>
                            </>
                        )}
                        <span className="text-muted-foreground/70" aria-hidden>
                            /
                        </span>
                        <span
                            className="min-w-0 truncate font-semibold text-foreground"
                            dir="auto"
                            aria-current="page"
                        >
                            {task.title}
                        </span>
                    </nav>
                </div>

                <TaskPageHeader
                    task={task}
                    actions={
                        <>
                            {can.update && (
                                <Button asChild>
                                    <Link
                                        href={route('tasks.edit', task.id)}
                                        className="inline-flex items-center gap-2"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {t('action_edit')}
                                    </Link>
                                </Button>
                            )}
                            {can.delete && (
                                <Button variant="destructive" onClick={handleDeleteTask}>
                                    <Trash2 className="h-4 w-4" />
                                    {t('action_delete')}
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="flex w-full flex-wrap gap-1 border-b border-border pb-0">
                                <TabsTrigger value="details">{t('tab_details')}</TabsTrigger>
                                <TabsTrigger value="comments">{t('tab_comments')}</TabsTrigger>
                                <TabsTrigger value="activity">{t('tab_activity')}</TabsTrigger>
                                <TabsTrigger value="subtasks">{t('tab_subtasks')}</TabsTrigger>
                                <TabsTrigger value="files">{t('tab_files')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="mt-6">
                                <TaskDetailsTab task={task} />
                            </TabsContent>
                            <TabsContent value="comments" className="mt-6">
                                <TaskCommentsPanel
                                    task={task}
                                    currentUserId={currentUserId}
                                    canInteract={can.update}
                                />
                            </TabsContent>
                            <TabsContent value="activity" className="mt-6">
                                <TaskActivityTimeline history={history} />
                            </TabsContent>
                            <TabsContent value="subtasks" className="mt-6">
                                <TaskSubtasksPanel
                                    task={task}
                                    canCreateSubtask={can.update}
                                />
                            </TabsContent>
                            <TabsContent value="files" className="mt-6">
                                <TaskFilesPanel task={task} canManage={can.update} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <aside className="space-y-4 lg:col-span-1">
                        <TaskMetaCard task={task} />
                        <TaskAssigneesCard task={task} />
                        <TaskLinkedEntitiesCard task={task} canManage={can.update} />
                        <TaskRemindersCard task={task} />
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
