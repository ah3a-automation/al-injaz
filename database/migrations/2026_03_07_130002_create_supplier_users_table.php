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
        Schema::create('supplier_users', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('email', 255);
            $table->string('password', 255);
            $table->string('role', 50)->default('user');
            $table->boolean('is_primary')->default(false);
            $table->timestampTz('last_login_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        DB::statement('CREATE UNIQUE INDEX uq_su_supplier_email ON supplier_users (supplier_id, email)');
        DB::statement('CREATE INDEX idx_su_supplier ON supplier_users (supplier_id)');
        DB::statement('CREATE INDEX idx_su_email ON supplier_users (email)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_users');
    }
};
