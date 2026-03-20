<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqEvaluation;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class RfqEvaluationService
{
    public function recordEvaluation(
        Rfq $rfq,
        Supplier $supplier,
        User $evaluator,
        float $priceScore,
        float $technicalScore,
        float $commercialScore,
        ?string $comments = null
    ): RfqEvaluation {
        $totalScore = $priceScore + $technicalScore + $commercialScore;

        $evaluation = $rfq->evaluations()->create([
            'supplier_id'     => $supplier->id,
            'evaluator_id'    => $evaluator->id,
            'price_score'     => $priceScore,
            'technical_score' => $technicalScore,
            'commercial_score'=> $commercialScore,
            'total_score'     => $totalScore,
            'comments'        => $comments,
        ]);

        $rfq->activities()->create([
            'activity_type' => 'rfq_evaluated',
            'description'   => 'Supplier evaluated.',
            'metadata'     => [
                'rfq_id'      => $rfq->id,
                'supplier_id' => $supplier->id,
                'score'       => $totalScore,
            ],
            'user_id'    => $evaluator->id,
            'actor_type' => $evaluator->getMorphClass(),
            'actor_id'   => (string) $evaluator->getKey(),
        ]);

        return $evaluation;
    }

    /**
     * Average total_score from all evaluators for the given supplier on this RFQ.
     */
    public function calculateSupplierScore(Rfq $rfq, Supplier $supplier): float
    {
        $avg = $rfq->evaluations()
            ->where('supplier_id', $supplier->id)
            ->avg('total_score');

        return $avg !== null ? round((float) $avg, 2) : 0.0;
    }

    /**
     * Supplier with highest aggregated score. When RFQ is under_evaluation, transition to recommended.
     *
     * @return array{supplier_id: string|null, average_score: float}|null
     */
    public function recommendSupplier(Rfq $rfq, ?Model $actor = null): ?array
    {
        $aggregated = $rfq->evaluations()
            ->selectRaw('supplier_id, AVG(total_score) as avg_score')
            ->groupBy('supplier_id')
            ->orderByDesc('avg_score')
            ->first();

        if ($aggregated === null) {
            return null;
        }

        $supplierId = $aggregated->supplier_id;
        $averageScore = round((float) $aggregated->avg_score, 2);

        if ($rfq->status === Rfq::STATUS_UNDER_EVALUATION) {
            $rfq->changeStatus(Rfq::STATUS_RECOMMENDED, $actor);
        }

        return [
            'supplier_id'    => $supplierId,
            'average_score'  => $averageScore,
        ];
    }
}
