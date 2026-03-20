<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreNotificationPreferencesBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'preferences'   => ['present', 'array'],
            'preferences.*.event_key' => ['required', 'string', 'max:100', Rule::exists('notification_templates', 'event_code')],
            'preferences.*.channel' => ['required', 'string', Rule::in(['inapp', 'email', 'whatsapp'])],
            'preferences.*.is_enabled' => ['required', 'boolean'],
        ];
    }
}
