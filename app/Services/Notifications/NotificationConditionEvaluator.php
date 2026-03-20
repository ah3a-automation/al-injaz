<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationConditionEvaluator
{
    /**
     * @param array<string, mixed> $conditionsJson
     * @param array<string, mixed> $context
     */
    public function evaluate(array $conditionsJson, array $context): NotificationConditionEvaluationResult
    {
        if ($conditionsJson === [] || $conditionsJson === [''] || empty($conditionsJson)) {
            return NotificationConditionEvaluationResult::passed();
        }

        // Supported format (v1):
        // {
        //   "mode": "all"|"any",
        //   "rules": [
        //      {"field":"supplier.status","op":"equals","value":"approved"},
        //      {"field":"days_to_expiry","op":"less_than_or_equal","value":30}
        //   ]
        // }
        $mode = is_string($conditionsJson['mode'] ?? null) ? (string) $conditionsJson['mode'] : 'all';
        $rules = $conditionsJson['rules'] ?? null;

        // Single-rule shorthand:
        if (! is_array($rules)) {
            if (isset($conditionsJson['field'], $conditionsJson['op'], $conditionsJson['value'])) {
                $rules = [$conditionsJson];
            } else {
                // Unknown/unsupported conditions structure: fail closed for safety.
                return NotificationConditionEvaluationResult::failed(
                    'Unrecognized conditions structure',
                    ['unrecognized_conditions' => true]
                );
            }
        }

        if (! is_array($rules)) {
            return NotificationConditionEvaluationResult::failed('Invalid conditions rules structure');
        }

        $evaluated = [];
        foreach ($rules as $i => $rule) {
            if (! is_array($rule)) {
                return NotificationConditionEvaluationResult::failed('Invalid condition rule entry at index ' . $i);
            }

            $field = is_string($rule['field'] ?? null) ? (string) $rule['field'] : (is_string($rule['path'] ?? null) ? (string) $rule['path'] : null);
            $op = is_string($rule['op'] ?? null) ? (string) $rule['op'] : null;
            $expected = $rule['value'] ?? null;

            if ($field === null || $op === null) {
                return NotificationConditionEvaluationResult::failed('Condition rule missing field/op at index ' . $i);
            }

            $actual = $this->getContextValueByPath($context, $field);
            $pass = $this->evaluateRule($actual, $op, $expected);
            $evaluated[] = ['rule_index' => $i, 'field' => $field, 'op' => $op, 'pass' => $pass];

            if ($mode === 'any' && $pass) {
                return NotificationConditionEvaluationResult::passed(['evaluated' => $evaluated]);
            }

            if ($mode !== 'any' && ! $pass) {
                return NotificationConditionEvaluationResult::failed('Condition rule failed', ['evaluated' => $evaluated]);
            }
        }

        return NotificationConditionEvaluationResult::passed(['evaluated' => $evaluated]);
    }

    /**
     * @param array<string, mixed> $context
     * @return mixed
     */
    private function getContextValueByPath(array $context, string $path): mixed
    {
        $segments = explode('.', $path);
        $current = $context;

        foreach ($segments as $seg) {
            if (! is_array($current) || ! array_key_exists($seg, $current)) {
                return null;
            }

            $current = $current[$seg];
        }

        return $current;
    }

    private function evaluateRule(mixed $actual, string $op, mixed $expected): bool
    {
        // Normalize booleans for equals/not_equals.
        if (is_string($expected) && in_array(strtolower($expected), ['true', 'false', '0', '1'], true)) {
            if ($expected === 'true' || $expected === '1') {
                $expected = true;
            } elseif ($expected === 'false' || $expected === '0') {
                $expected = false;
            }
        }

        switch ($op) {
            case 'equals':
                return $this->compareEquals($actual, $expected);
            case 'not_equals':
                return ! $this->compareEquals($actual, $expected);
            case 'in':
                return $this->compareIn($actual, $expected, true);
            case 'not_in':
                return $this->compareIn($actual, $expected, false);
            case 'boolean':
                return $this->compareBoolean($actual, $expected);
            case 'less_than':
                return $this->compareNumeric($actual, $expected, '<');
            case 'less_than_or_equal':
                return $this->compareNumeric($actual, $expected, '<=');
            case 'greater_than':
                return $this->compareNumeric($actual, $expected, '>');
            case 'greater_than_or_equal':
                return $this->compareNumeric($actual, $expected, '>=');
            default:
                // Unknown operator: fail closed for rule evaluation.
                return false;
        }
    }

    private function compareEquals(mixed $actual, mixed $expected): bool
    {
        $aNum = $this->tryToNumber($actual);
        $eNum = $this->tryToNumber($expected);
        if ($aNum !== null && $eNum !== null) {
            return $aNum === $eNum;
        }

        if (is_bool($expected)) {
            if (is_bool($actual)) {
                return $actual === $expected;
            }
            if (is_string($actual) && in_array(strtolower($actual), ['true', 'false'], true)) {
                $actualBool = strtolower($actual) === 'true';
                return $actualBool === $expected;
            }

            return false;
        }

        return $actual === $expected;
    }

    private function compareIn(mixed $actual, mixed $expected, bool $isIn): bool
    {
        if (! is_array($expected)) {
            return false;
        }

        $contains = false;
        foreach ($expected as $item) {
            if ($this->compareEquals($actual, $item)) {
                $contains = true;
                break;
            }
        }

        return $isIn ? $contains : ! $contains;
    }

    private function compareBoolean(mixed $actual, mixed $expected): bool
    {
        if (! is_bool($expected)) {
            return false;
        }

        if (is_bool($actual)) {
            return $actual === $expected;
        }

        if (is_string($actual)) {
            $normalized = strtolower($actual);
            if ($normalized === 'true') {
                return $expected === true;
            }
            if ($normalized === 'false') {
                return $expected === false;
            }
        }

        return false;
    }

    private function compareNumeric(mixed $actual, mixed $expected, string $op): bool
    {
        $aNum = $this->tryToNumber($actual);
        $eNum = $this->tryToNumber($expected);
        if ($aNum === null || $eNum === null) {
            return false;
        }

        return match ($op) {
            '<' => $aNum < $eNum,
            '<=' => $aNum <= $eNum,
            '>' => $aNum > $eNum,
            '>=' => $aNum >= $eNum,
            default => false,
        };
    }

    private function tryToNumber(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        if (is_string($value) && $value !== '' && is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }
}

