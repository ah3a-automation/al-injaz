<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ActivityLog;

final class TimelineBuilder
{
    /**
     * Build a normalized activity timeline for a given subject.
     *
     * @param class-string $subjectType
     * @param string       $subjectId
     * @param int          $limit
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forSubject(string $subjectType, string $subjectId, int $limit = 50): array
    {
        return ActivityLog::where('subject_type', $subjectType)
            ->where('subject_id', $subjectId)
            ->with('causer:id,name')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(static function (ActivityLog $log): array {
                return [
                    'id'        => $log->id,
                    'event'     => $log->event,
                    'title'     => self::titleForEvent($log->event),
                    'actor'     => $log->causer?->name ?? __('activity.system'),
                    'timestamp' => $log->created_at?->toIso8601String(),
                    'context'   => $log->context ?? [],
                ];
            })
            ->values()
            ->all();
    }

    private static function titleForEvent(string $event): string
    {
        $key = 'activity.' . str_replace('.', '_', $event);
        $translated = __($key);

        if ($translated === $key) {
            return ucfirst(str_replace(['.', '_'], ' ', $event));
        }

        return $translated;
    }
}

