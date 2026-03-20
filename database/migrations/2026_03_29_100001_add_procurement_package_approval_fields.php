<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procurement_packages', function (Blueprint $table): void {
            $table->string('approval_status', 30)->default('draft')->after('status');
            $table->unsignedBigInteger('approved_by')->nullable()->after('approval_status');
            $table->timestampTz('approved_at')->nullable()->after('approved_by');
            $table->text('approval_notes')->nullable()->after('approved_at');
            $table->timestampTz('submitted_for_approval_at')->nullable()->after('approval_notes');

            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('procurement_packages', function (Blueprint $table): void {
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'approval_status',
                'approved_by',
                'approved_at',
                'approval_notes',
                'submitted_for_approval_at',
            ]);
        });
    }
};
