import { Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

export interface TimelineEvent {
    id: string | number;
    event: string;
    title: string;
    actor?: string | null;
    timestamp: string;
    context?: Record<string, unknown>;
}

interface Props {
    events: TimelineEvent[];
    emptyMessage?: string;
}

export function ActivityTimeline({ events, emptyMessage }: Props) {
    const { t } = useLocale();

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                    {emptyMessage ?? t('no_activity', 'activity')}
                </p>
            </div>
        );
    }

    const sorted = [...events].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="relative ps-6 space-y-4">
            <div className="absolute start-2 top-0 bottom-0 w-px bg-border" />
            {sorted.map((event, i) => (
                <div key={`${event.id}-${i}`} className="relative flex items-start gap-3">
                    <div className="absolute -start-[1.1rem] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="min-w-0 flex-1 pb-1 text-start">
                        <p className="text-sm font-medium leading-snug">{event.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {event.actor && <span>{event.actor}</span>}
                            {event.actor && <span>·</span>}
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
