<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure roles and permissions exist first
        (new RolesAndPermissionsSeeder())->run();

        $admin = User::updateOrCreate(
            ['email' => 'admin@al-injaz.test'],
            [
                'name'                 => 'Enterprise Super Admin',
                'password'             => Hash::make('password'),
                'status'               => 'active',
                'must_change_password' => false,
                'email_verified_at'    => now(),
            ]
        );

        $admin->syncRoles(['super_admin']);

        if (app()->runningInConsole() && isset($this->command)) {
            $this->command->info('Admin user ready: admin@al-injaz.test / password');
        }
    }
}
