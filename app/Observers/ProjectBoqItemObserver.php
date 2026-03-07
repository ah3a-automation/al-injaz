<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\ProjectBoqItem;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;

class ProjectBoqItemObserver
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    public function created(ProjectBoqItem $item): void
    {
        $this->logAfterCommit('boq.item_created', $item, [], $item->toArray());
    }

    public function updated(ProjectBoqItem $item): void
    {
        $changedKeys = array_keys($item->getChanges());
        $oldValues = array_intersect_key($item->getOriginal(), array_flip($changedKeys));
        $newValues = $item->getChanges();
        $this->logAfterCommit('boq.item_updated', $item, $oldValues, $newValues);
    }

    private function logAfterCommit(
        string $event,
        ProjectBoqItem $item,
        array $oldValues,
        array $newValues
    ): void {
        DB::afterCommit(function () use ($event, $item, $oldValues, $newValues): void {
            $causer = auth()->user();
            if ($causer instanceof User) {
                $this->activityLogger->log($event, $item, $oldValues, $newValues, $causer);
            }
        });
    }
}
