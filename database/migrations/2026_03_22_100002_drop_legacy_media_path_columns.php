<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop legacy file path columns after migrating to Spatie Media Library.
     * Run media:migrate-legacy first to copy existing files into media library.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'avatar_path')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('avatar_path');
            });
        }

        if (Schema::hasColumn('suppliers', 'company_logo_path')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $table->dropColumn('company_logo_path');
            });
        }

        if (Schema::hasColumn('supplier_contacts', 'avatar_path')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                $table->dropColumn('avatar_path');
            });
        }
        if (Schema::hasColumn('supplier_contacts', 'business_card_front_path')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                $table->dropColumn('business_card_front_path');
            });
        }
        if (Schema::hasColumn('supplier_contacts', 'business_card_back_path')) {
            Schema::table('supplier_contacts', function (Blueprint $table) {
                $table->dropColumn('business_card_back_path');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path', 500)->nullable()->after('department');
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('company_logo_path', 500)->nullable()->after('logo_path');
        });

        Schema::table('supplier_contacts', function (Blueprint $table) {
            $table->string('avatar_path', 500)->nullable()->after('mobile');
            $table->string('business_card_front_path', 500)->nullable()->after('avatar_path');
            $table->string('business_card_back_path', 500)->nullable()->after('business_card_front_path');
        });
    }
};
