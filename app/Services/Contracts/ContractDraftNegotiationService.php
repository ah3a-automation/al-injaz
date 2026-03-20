<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDraftArticle;
use App\Models\ContractDraftArticleNegotiation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractDraftNegotiationService
{
    /**
     * @param array<string, mixed> $data
     * @return array{0: bool, 1: array<string, mixed>, 2: array<string, mixed>}
     */
    public function updateNegotiationState(
        Contract $contract,
        ContractDraftArticle $draftArticle,
        array $data,
        User $actor
    ): array {
        if ($draftArticle->contract_id !== $contract->id) {
            throw new RuntimeException('Draft article does not belong to this contract.');
        }

        return DB::transaction(function () use ($draftArticle, $data, $actor): array {
            $old = [
                'negotiation_status' => $draftArticle->negotiation_status,
                'negotiation_notes' => $draftArticle->negotiation_notes,
                'legal_notes' => $draftArticle->legal_notes,
                'commercial_notes' => $draftArticle->commercial_notes,
                'negotiation_internal_notes' => $draftArticle->negotiation_internal_notes,
                'has_deviation' => $draftArticle->has_deviation,
                'requires_special_approval' => $draftArticle->requires_special_approval,
            ];

            $draftArticle->fill([
                'negotiation_status' => $data['negotiation_status'] ?? $draftArticle->negotiation_status,
                'negotiation_notes' => $data['negotiation_notes'] ?? $draftArticle->negotiation_notes,
                'legal_notes' => $data['legal_notes'] ?? $draftArticle->legal_notes,
                'commercial_notes' => $data['commercial_notes'] ?? $draftArticle->commercial_notes,
                'negotiation_internal_notes' => $data['negotiation_internal_notes'] ?? $draftArticle->negotiation_internal_notes,
                'has_deviation' => array_key_exists('has_deviation', $data)
                    ? (bool) $data['has_deviation']
                    : $draftArticle->has_deviation,
                'requires_special_approval' => array_key_exists('requires_special_approval', $data)
                    ? (bool) $data['requires_special_approval']
                    : $draftArticle->requires_special_approval,
            ]);

            $new = [
                'negotiation_status' => $draftArticle->negotiation_status,
                'negotiation_notes' => $draftArticle->negotiation_notes,
                'legal_notes' => $draftArticle->legal_notes,
                'commercial_notes' => $draftArticle->commercial_notes,
                'negotiation_internal_notes' => $draftArticle->negotiation_internal_notes,
                'has_deviation' => $draftArticle->has_deviation,
                'requires_special_approval' => $draftArticle->requires_special_approval,
            ];

            if ($old === $new) {
                return [false, $old, $new];
            }

            $draftArticle->negotiation_updated_by_user_id = $actor->id;
            $draftArticle->negotiation_updated_at = now();
            $draftArticle->save();

            $this->appendNegotiationSnapshot($draftArticle, $actor, $new);

            return [true, $old, $new];
        });
    }

    /**
     * @param array<string, mixed> $state
     */
    private function appendNegotiationSnapshot(
        ContractDraftArticle $draftArticle,
        User $actor,
        array $state
    ): void {
        $log = new ContractDraftArticleNegotiation();
        $log->fill([
            'contract_draft_article_id' => $draftArticle->id,
            'negotiation_status' => $state['negotiation_status'],
            'negotiation_notes' => $state['negotiation_notes'],
            'legal_notes' => $state['legal_notes'],
            'commercial_notes' => $state['commercial_notes'],
            'negotiation_internal_notes' => $state['negotiation_internal_notes'],
            'has_deviation' => $state['has_deviation'],
            'requires_special_approval' => $state['requires_special_approval'],
            'changed_by_user_id' => $actor->id,
        ]);
        $log->save();
    }
}

