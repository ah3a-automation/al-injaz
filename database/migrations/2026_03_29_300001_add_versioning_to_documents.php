<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('procurement_package_attachments', function (Blueprint $table): void {
            if (! Schema::hasColumn('procurement_package_attachments', 'version')) {
                $table->unsignedSmallInteger('version')->default(1)->after('mime_type');
            }

            if (! Schema::hasColumn('procurement_package_attachments', 'is_current')) {
                $table->boolean('is_current')->default(true)->after('version');
            }
        });

        Schema::table('rfq_documents', function (Blueprint $table): void {
            if (! Schema::hasColumn('rfq_documents', 'version')) {
                $table->unsignedSmallInteger('version')->default(1)->after('mime_type');
            }

            if (! Schema::hasColumn('rfq_documents', 'is_current')) {
                $table->boolean('is_current')->default(true)->after('version');
            }
        });

        Schema::table('supplier_documents', function (Blueprint $table): void {
            if (! Schema::hasColumn('supplier_documents', 'version')) {
                $table->unsignedSmallInteger('version')->default(1)->after('file_size');
            }

            if (! Schema::hasColumn('supplier_documents', 'is_current')) {
                $table->boolean('is_current')->default(true)->after('version');
            }
        });
    }

    public function down(): void
    {
        Schema::table('procurement_package_attachments', function (Blueprint $table): void {
            if (Schema::hasColumn('procurement_package_attachments', 'is_current')) {
                $table->dropColumn('is_current');
            }

            if (Schema::hasColumn('procurement_package_attachments', 'version')) {
                $table->dropColumn('version');
            }
        });

        Schema::table('rfq_documents', function (Blueprint $table): void {
            if (Schema::hasColumn('rfq_documents', 'is_current')) {
                $table->dropColumn('is_current');
            }

            if (Schema::hasColumn('rfq_documents', 'version')) {
                $table->dropColumn('version');
            }
        });

        Schema::table('supplier_documents', function (Blueprint $table): void {
            if (Schema::hasColumn('supplier_documents', 'is_current')) {
                $table->dropColumn('is_current');
            }

            if (Schema::hasColumn('supplier_documents', 'version')) {
                $table->dropColumn('version');
            }
        });
    }
};

