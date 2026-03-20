<?php

declare(strict_types=1);

namespace App\Http\Requests\Contracts;

use App\Models\Contract;
use Illuminate\Foundation\Http\FormRequest;

final class SubmitContractForReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Contract $contract */
        $contract = $this->route('contract');

        return $this->user()?->can('update', $contract) === true;
    }

    public function rules(): array
    {
        return [];
    }
}

