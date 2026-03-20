<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_contacts', function (Blueprint $table) {
            $table->string('business_card_front_path', 500)->nullable()->after('avatar_path');
            $table->string('business_card_back_path', 500)->nullable()->after('business_card_front_path');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_contacts', function (Blueprint $table) {
            $table->dropColumn(['business_card_front_path', 'business_card_back_path']);
        });
    }
};
