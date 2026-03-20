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
        if (! Schema::hasTable('rfqs')) {
            return;
        }

        $statuses = [
            'draft',
            'internally_approved',
            'issued',
            'supplier_questions_open',
            'responses_received',
            'under_evaluation',
            'recommended',
            'awarded',
            'closed',
            'cancelled',
        ];

        DB::table('rfqs')->where('status', 'supplier_submissions')->update(['status' => 'responses_received']);
        DB::table('rfqs')->where('status', 'evaluation')->update(['status' => 'under_evaluation']);
        DB::table('rfqs')->where('status', 'sent')->update(['status' => 'issued']);

        DB::statement('ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS chk_rfq_status');
        DB::statement('ALTER TABLE rfqs ADD CONSTRAINT chk_rfq_status CHECK (status IN (\'' . implode("','", $statuses) . '\'))');
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfqs')) {
            return;
        }

        DB::statement('ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS chk_rfq_status');
        DB::statement("ALTER TABLE rfqs ADD CONSTRAINT chk_rfq_status CHECK (status IN ('draft','issued','supplier_submissions','evaluation','awarded','closed'))");
        DB::table('rfqs')->where('status', 'responses_received')->update(['status' => 'supplier_submissions']);
        DB::table('rfqs')->where('status', 'under_evaluation')->update(['status' => 'evaluation']);
    }
};
