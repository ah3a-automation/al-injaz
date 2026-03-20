<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\SupplierIntelligence\SupplierRiskScoreService;
use Illuminate\Console\Command;

final class RecalculateSupplierRiskScoresCommand extends Command
{
    protected $signature = 'suppliers:recalculate-risk-scores';

    protected $description = 'Recalculate risk scores for all approved/suspended suppliers (Supplier Intelligence Engine)';

    public function handle(SupplierRiskScoreService $riskScoreService): int
    {
        $this->info('Recalculating supplier risk scores...');
        $result = $riskScoreService->recalculateAll();
        $this->info("Processed: {$result['processed']}, Updated: {$result['updated']}");
        return self::SUCCESS;
    }
}
