import type { Task } from '@/types';

/** Maps task.status to tasks.php translation key suffix. */
export function taskStatusTranslationKey(status: Task['status']): string {
    const map: Record<Task['status'], string> = {
        backlog: 'status_backlog',
        open: 'status_open',
        in_progress: 'status_in_progress',
        review: 'status_review',
        done: 'status_done',
        cancelled: 'status_cancelled',
    };
    return map[status] ?? 'status_open';
}

export function taskPriorityTranslationKey(priority: Task['priority']): string {
    const map: Record<Task['priority'], string> = {
        low: 'priority_low',
        normal: 'priority_normal',
        high: 'priority_high',
        urgent: 'priority_urgent',
    };
    return map[priority] ?? 'priority_normal';
}

/** Map ActivityLogger event string → tasks.php key (fallback: raw event). */
export function taskActivityTranslationKey(event: string): string | null {
    const map: Record<string, string> = {
        'tasks.task.created': 'activity_task_created',
        'tasks.task.updated': 'activity_task_updated',
        'tasks.task.deleted': 'activity_task_deleted',
        'tasks.assignee.added': 'activity_assignee_added',
        'tasks.assignee.removed': 'activity_assignee_removed',
        'tasks.comment.added': 'activity_comment_added',
        'tasks.comment.deleted': 'activity_comment_deleted',
        'tasks.link.added': 'activity_link_added',
        'tasks.link.removed': 'activity_link_removed',
        'tasks.reminder.set': 'activity_reminder_set',
        'tasks.attachment.added': 'activity_attachment_added',
        'tasks.attachment.removed': 'activity_attachment_removed',
        'tasks.status.changed': 'activity_status_changed',
    };
    return map[event] ?? null;
}
