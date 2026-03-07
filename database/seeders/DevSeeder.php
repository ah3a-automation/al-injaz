<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }


        $users = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@al-injaz.test',
                'password' => Hash::make('password'),
                'role' => 'super_admin',
            ],
            [
                'name' => 'Admin',
                'email' => 'admin@al-injaz.test',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'Project Manager',
                'email' => 'pm@al-injaz.test',
                'password' => Hash::make('password'),
                'role' => 'project_manager',
            ],
            [
                'name' => 'Member',
                'email' => 'member@al-injaz.test',
                'password' => Hash::make('password'),
                'role' => 'member',
            ],
            [
                'name' => 'Viewer',
                'email' => 'viewer@al-injaz.test',
                'password' => Hash::make('password'),
                'role' => 'viewer',
            ],
        ];

        foreach ($users as $data) {
            $role = $data['role'];
            unset($data['role']);

            $user = User::firstOrCreate(
                ['email' => $data['email']],
                $data
            );

            if (!$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
    }
}
