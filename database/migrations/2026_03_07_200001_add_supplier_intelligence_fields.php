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
            $table->date('insurance_expiry_date')->nullable()->after('license_expiry_date');
            $table->date('vat_expiry_date')->nullable()->after('vat_number');
            $table->text('suspension_reason')->nullable()->after('suspended_at');
            $table->foreignId('suspended_by_user_id')->nullable()->after('suspension_reason')->constrained('users')->nullOnDelete();
            $table->text('blacklist_reason')->nullable()->after('blacklisted_at');
            $table->foreignId('blacklisted_by_user_id')->nullable()->after('blacklist_reason')->constrained('users')->nullOnDelete();
        });
        DB::statement('CREATE INDEX idx_suppliers_insurance_expiry ON suppliers (insurance_expiry_date) WHERE insurance_expiry_date IS NOT NULL');
        DB::statement('CREATE INDEX idx_suppliers_vat_expiry ON suppliers (vat_expiry_date) WHERE vat_expiry_date IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_insurance_expiry');
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_vat_expiry');
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['suspended_by_user_id']);
            $table->dropForeign(['blacklisted_by_user_id']);
            $table->dropColumn([
                'insurance_expiry_date',
                'vat_expiry_date',
                'suspension_reason',
                'suspended_by_user_id',
                'blacklist_reason',
                'blacklisted_by_user_id',
            ]);
        });
    }
};
