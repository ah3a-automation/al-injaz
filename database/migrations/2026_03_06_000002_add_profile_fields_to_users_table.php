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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('department', 100)->nullable()->after('phone');
            $table->string('avatar_path', 500)->nullable()->after('department');
            $table->string('status', 20)->default('active')->after('avatar_path');
            $table->boolean('must_change_password')->default(false)->after('status');
            $table->timestampTz('last_login_at')->nullable()->after('must_change_password');
            $table->unsignedBigInteger('created_by_user_id')->nullable()->after('last_login_at');
            $table->timestampTz('deleted_at')->nullable()->after('updated_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('created_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'suspended'))");
        DB::statement('CREATE INDEX idx_users_status ON users (status)');
        DB::statement('CREATE INDEX idx_users_department ON users (department)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_users_department');
        DB::statement('DROP INDEX IF EXISTS idx_users_status');
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['created_by_user_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'department',
                'avatar_path',
                'status',
                'must_change_password',
                'last_login_at',
                'created_by_user_id',
                'deleted_at',
            ]);
        });
    }
};
