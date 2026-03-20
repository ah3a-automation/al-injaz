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
            $table->foreignUuid('recommended_supplier_id')->nullable()->after('closed_at')->constrained('suppliers')->nullOnDelete();
            $table->text('recommendation_notes')->nullable()->after('recommended_supplier_id');
            $table->string('recommendation_status', 30)->default('draft')->after('recommendation_notes');
            $table->unsignedBigInteger('recommended_by')->nullable()->after('recommendation_status');
            $table->timestampTz('recommended_at')->nullable()->after('recommended_by');

            $table->foreign('recommended_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rfqs', function (Blueprint $table): void {
            $table->dropForeign(['recommended_supplier_id']);
            $table->dropForeign(['recommended_by']);
            $table->dropColumn([
                'recommended_supplier_id',
                'recommendation_notes',
                'recommendation_status',
                'recommended_by',
                'recommended_at',
            ]);
        });
    }
};
