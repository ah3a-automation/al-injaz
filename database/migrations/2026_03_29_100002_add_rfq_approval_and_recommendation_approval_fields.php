<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rfqs', function (Blueprint $table): void {
            $table->string('approval_status', 30)->default('draft')->after('recommended_at');
            $table->unsignedBigInteger('rfq_approved_by')->nullable()->after('approval_status');
            $table->timestampTz('rfq_approved_at')->nullable()->after('rfq_approved_by');
            $table->text('rfq_approval_notes')->nullable()->after('rfq_approved_at');
            $table->timestampTz('rfq_submitted_for_approval_at')->nullable()->after('rfq_approval_notes');

            $table->unsignedBigInteger('recommendation_approved_by')->nullable()->after('rfq_submitted_for_approval_at');
            $table->timestampTz('recommendation_approved_at')->nullable()->after('recommendation_approved_by');
            $table->text('recommendation_approval_notes')->nullable()->after('recommendation_approved_at');
            $table->unsignedBigInteger('recommendation_rejected_by')->nullable()->after('recommendation_approval_notes');
            $table->timestampTz('recommendation_rejected_at')->nullable()->after('recommendation_rejected_by');

            $table->foreign('rfq_approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('recommendation_approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('recommendation_rejected_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rfqs', function (Blueprint $table): void {
            $table->dropForeign(['rfq_approved_by']);
            $table->dropForeign(['recommendation_approved_by']);
            $table->dropForeign(['recommendation_rejected_by']);
            $table->dropColumn([
                'approval_status',
                'rfq_approved_by',
                'rfq_approved_at',
                'rfq_approval_notes',
                'rfq_submitted_for_approval_at',
                'recommendation_approved_by',
                'recommendation_approved_at',
                'recommendation_approval_notes',
                'recommendation_rejected_by',
                'recommendation_rejected_at',
            ]);
        });
    }
};
