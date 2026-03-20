<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\Contract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreContractReviewDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Contract $contract */
        $contract = $this->route('contract');

        return $this->user()?->can('update', $contract) === true;
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', 'string', Rule::in(['legal', 'commercial', 'management'])],
            'decision' => ['required', 'string', Rule::in(['approved', 'rejected', 'returned_for_rework'])],
            'review_notes' => ['nullable', 'string'],
        ];
    }
}

