<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rfq_suppliers', function (Blueprint $table): void {
            $table->boolean('on_vendor_list')->default(false)->after('invited_by');
        });
    }

    public function down(): void
    {
        Schema::table('rfq_suppliers', function (Blueprint $table): void {
            $table->dropColumn('on_vendor_list');
        });
    }
};
