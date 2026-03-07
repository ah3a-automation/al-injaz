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
        Schema::create('supplier_zone_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('zone_code', 10);
            $table->string('zone_name', 100);
            $table->string('city_name', 100)->nullable();
            $table->string('city_code', 20)->nullable();
            $table->boolean('covers_entire_zone')->default(true);
            $table->timestampsTz();
        });
        DB::statement('ALTER TABLE supplier_zone_assignments ADD CONSTRAINT uq_sup_zones_supplier_code UNIQUE (supplier_id, zone_code)');
        DB::statement('CREATE INDEX idx_sup_zones_supplier ON supplier_zone_assignments (supplier_id)');
        $zones = "'RYD','JED','DAM','MED','ABH','TAI','BUR','HAI','JAZ','NAJ','JOF','NOR','BAH'";
        DB::statement("ALTER TABLE supplier_zone_assignments ADD CONSTRAINT chk_zone_code CHECK (zone_code IN ($zones))");
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_zone_assignments');
    }
};
