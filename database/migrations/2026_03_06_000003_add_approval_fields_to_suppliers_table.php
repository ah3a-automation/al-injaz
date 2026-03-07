<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->timestampTz('approved_at')->nullable()->after('registration_token_expires_at');
            $table->unsignedBigInteger('approved_by_user_id')->nullable()->after('approved_at');
            $table->timestampTz('rejected_at')->nullable()->after('approved_by_user_id');
            $table->unsignedBigInteger('rejected_by_user_id')->nullable()->after('rejected_at');
            $table->text('rejection_reason')->nullable()->after('rejected_by_user_id');
            $table->text('approval_notes')->nullable()->after('rejection_reason');
            $table->text('more_info_notes')->nullable()->after('approval_notes');
            $table->timestampTz('suspended_at')->nullable()->after('more_info_notes');
            $table->timestampTz('blacklisted_at')->nullable()->after('suspended_at');
            $table->unsignedBigInteger('supplier_user_id')->nullable()->after('blacklisted_at');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->foreign('approved_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
            $table->foreign('rejected_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
            $table->foreign('supplier_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        DB::statement('ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_status');
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_status CHECK (
            status IN (
                'pending_registration',
                'pending_review',
                'under_review',
                'more_info_requested',
                'approved',
                'rejected',
                'suspended',
                'blacklisted'
            )
        )");
        DB::statement('CREATE INDEX idx_suppliers_approved_by ON suppliers (approved_by_user_id)');
        DB::statement('CREATE INDEX idx_suppliers_supplier_user ON suppliers (supplier_user_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_supplier_user');
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_approved_by');
        DB::statement('ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_status');
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_status CHECK (
            status IN ('pending_registration','under_review','approved','suspended','blacklisted')
        )");

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['approved_by_user_id']);
            $table->dropForeign(['rejected_by_user_id']);
            $table->dropForeign(['supplier_user_id']);
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'approved_at',
                'approved_by_user_id',
                'rejected_at',
                'rejected_by_user_id',
                'rejection_reason',
                'approval_notes',
                'more_info_notes',
                'suspended_at',
                'blacklisted_at',
                'supplier_user_id',
            ]);
        });
    }
};
