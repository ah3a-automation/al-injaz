<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;

final class RfqClarificationService
{
    public function createQuestion(Rfq $rfq, string $question, ?Supplier $supplier = null, ?Model $actor = null): RfqClarification
    {
        $clarification = $rfq->clarifications()->create([
            'supplier_id' => $supplier?->id,
            'question'    => $question,
            'status'     => RfqClarification::STATUS_OPEN,
            'visibility'  => RfqClarification::VISIBILITY_PRIVATE,
            'asked_by'    => $actor instanceof \App\Models\User ? $actor->getKey() : null,
            'actor_type'  => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'    => $actor !== null ? (string) $actor->getKey() : null,
        ]);

        $rfq->activities()->create([
            'activity_type' => 'clarification_added',
            'description'   => 'Clarification question added.',
            'metadata'      => [
                'clarification_id' => $clarification->id,
                'supplier_id'      => $supplier?->id,
            ],
            'user_id'    => $actor instanceof \App\Models\User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'   => $actor !== null ? (string) $actor->getKey() : null,
        ]);

        app(\App\Services\Procurement\RfqEventService::class)->clarificationAdded($clarification);

        return $clarification;
    }

    public function answerClarification(RfqClarification $clarification, string $answer, ?Model $actor = null): void
    {
        $clarification->update([
            'answer'      => $answer,
            'status'      => RfqClarification::STATUS_ANSWERED,
            'answered_at' => now(),
            'answered_by' => $actor instanceof \App\Models\User ? $actor->getKey() : null,
            'actor_type'  => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'    => $actor !== null ? (string) $actor->getKey() : null,
        ]);

        $clarification->rfq->activities()->create([
            'activity_type' => 'clarification_answered',
            'description'   => 'Clarification answered.',
            'metadata'      => [
                'clarification_id' => $clarification->id,
                'supplier_id'      => $clarification->supplier_id,
            ],
            'user_id'    => $actor instanceof \App\Models\User ? $actor->getKey() : null,
            'actor_type' => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'   => $actor !== null ? (string) $actor->getKey() : null,
        ]);

        app(\App\Services\Procurement\RfqEventService::class)->clarificationAnswered($clarification);
    }

    public function closeClarification(RfqClarification $clarification, ?Model $actor = null): void
    {
        $clarification->update([
            'status'    => RfqClarification::STATUS_CLOSED,
            'actor_type'=> $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'  => $actor !== null ? (string) $actor->getKey() : null,
        ]);
    }
}
