<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Services\Notifications\NotificationConditionEvaluator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationConditionEvaluatorTest extends TestCase
{
    #[Test]
    public function test_equals_and_numeric_less_than_or_equal_all_mode(): void
    {
        $evaluator = new NotificationConditionEvaluator();

        $conditionsJson = [
            'mode' => 'all',
            'rules' => [
                [
                    'field' => 'supplier.status',
                    'op' => 'equals',
                    'value' => 'approved',
                ],
                [
                    'field' => 'days_to_expiry',
                    'op' => 'less_than_or_equal',
                    'value' => 30,
                ],
            ],
        ];

        $context = [
            'supplier' => ['status' => 'approved'],
            'days_to_expiry' => 20,
        ];

        $result = $evaluator->evaluate($conditionsJson, $context);

        $this->assertTrue($result->passed);
    }

    #[Test]
    public function test_condition_fails_when_rule_does_not_match(): void
    {
        $evaluator = new NotificationConditionEvaluator();

        $conditionsJson = [
            'mode' => 'all',
            'rules' => [
                [
                    'field' => 'supplier.status',
                    'op' => 'equals',
                    'value' => 'approved',
                ],
            ],
        ];

        $context = [
            'supplier' => ['status' => 'rejected'],
        ];

        $result = $evaluator->evaluate($conditionsJson, $context);

        $this->assertFalse($result->passed);
        $this->assertNotNull($result->reason);
    }

    #[Test]
    public function test_unrecognized_non_empty_conditions_fail_closed(): void
    {
        $evaluator = new NotificationConditionEvaluator();

        $conditionsJson = [
            'unexpected' => 'shape',
        ];

        $result = $evaluator->evaluate($conditionsJson, ['supplier' => ['status' => 'approved']]);

        $this->assertFalse($result->passed);
        $this->assertNotNull($result->reason);
    }
}

