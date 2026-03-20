<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_documents', function (Blueprint $table): void {
            if (! Schema::hasColumn('supplier_documents', 'last_expiry_notified_at')) {
                $table->timestampTz('last_expiry_notified_at')->nullable()->after('is_mandatory');
            }
        });
    }

    public function down(): void
    {
        Schema::table('supplier_documents', function (Blueprint $table): void {
            if (Schema::hasColumn('supplier_documents', 'last_expiry_notified_at')) {
                $table->dropColumn('last_expiry_notified_at');
            }
        });
    }
};

