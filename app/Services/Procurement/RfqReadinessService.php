<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;

final class RfqReadinessService
{
    /**
     * Check if an RFQ is ready to be issued.
     * Documents are optional at issue-time; UI shows a warning when absent.
     *
     * @return array{ready: bool, missing: list<string>}
     */
    public function check(Rfq $rfq): array
    {
        $missing = [];

        $rfq->loadCount(['suppliers', 'items']);

        if ($rfq->suppliers_count < 1) {
            $missing[] = 'suppliers';
        }

        if ($rfq->items_count < 1) {
            $missing[] = 'items';
        }

        if ($rfq->submission_deadline === null) {
            $missing[] = 'deadline';
        }

        return [
            'ready'  => $missing === [],
            'missing' => $missing,
        ];
    }
}
