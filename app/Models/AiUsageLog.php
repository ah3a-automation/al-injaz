<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'feature',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'cost_usd',
        'cost_sar',
        'response_time_ms',
        'user_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prompt_tokens'     => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens'      => 'integer',
            'cost_usd'          => 'decimal:6',
            'cost_sar'          => 'decimal:6',
            'response_time_ms'  => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
