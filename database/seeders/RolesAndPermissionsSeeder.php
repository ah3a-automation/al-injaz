<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    private const GUARD = 'web';

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = $this->permissionNames();
        foreach ($permissions as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => self::GUARD],
                ['name' => $name, 'guard_name' => self::GUARD]
            );
        }

        $roles = [
            'super_admin',
            'admin',
            'procurement_manager',
            'evaluator',
            'procurement_officer',
            'technical_manager',
            'project_manager',
            'member',
            'viewer',
            'supplier',
        ];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => self::GUARD],
                ['name' => $roleName, 'guard_name' => self::GUARD]
            );
        }

        $this->assignPermissionsToRoles();
    }

    /**
     * @return array<int, string>
     */
    private function permissionNames(): array
    {
        return [
            'projects.viewAny',
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.edit',
            'projects.delete',
            'projects.export',
            'tasks.viewAny',
            'tasks.view',
            'tasks.create',
            'tasks.update',
            'tasks.edit',
            'tasks.delete',
            'tasks.assign',
            'tasks.export',
            'suppliers.view',
            'suppliers.create',
            'suppliers.edit',
            'suppliers.delete',
            'suppliers.approve',
            'suppliers.export',
            'comments.viewAny',
            'comments.view',
            'comments.create',
            'comments.delete',
            'notifications.viewAny',
            'notifications.markRead',
            'finance.viewAny',
            'finance.view',
            'finance.manage',
            'finance.export',
            'members.viewAny',
            'members.manage',
            'audit.viewAny',
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'users.impersonate',
            'settings.manage',
            // ── Admin: Company Branding & Supplier Master Data ───────────────
            'company.branding.manage',
            'categories.manage',
            'capabilities.manage',
            'certifications.manage',
            // ── BOQ ──────────────────────────────────────────────────────────
            'boq.view',
            'boq.import',
            'boq.edit',
            'boq.activate_version',
            'boq.export',

            // ── Project Structure ────────────────────────────────────────────
            'projects.systems.view',
            'projects.systems.create',
            'projects.systems.edit',
            'projects.systems.delete',
            'projects.packages.view',
            'projects.packages.create',
            'projects.packages.edit',
            'projects.packages.delete',

            // ── Purchase Requests ────────────────────────────────────────────
            'pr.view',
            'pr.create',
            'pr.submit',
            'pr.approve',
            'pr.reject',
            'pr.convert_to_rfq',

            // ── Margin & Financial Governance ───────────────────────────────
            'margin.view_exceptions',
            'margin.request_exception',
            'margin.approve_exception',

            // ── RFQ ──────────────────────────────────────────────────────────
            'rfq.view',
            'rfq.create',
            'rfq.issue',
            'rfq.evaluate',
            'rfq.award',
            'rfq.close',
            'rfq.submit_quote',

            // ── Contract ─────────────────────────────────────────────────────
            'contract.manage',
            'contract.terminate',
            'contract.variation.create',
            'contract.variation.approve',
            'contract.invoice.create',
            'contract.invoice.approve',
            'contract.invoice.pay',
        ];
    }

    private function assignPermissionsToRoles(): void
    {
        $superAdmin = Role::findByName('super_admin', self::GUARD);
        $superAdmin->syncPermissions(Permission::all());

        $admin = Role::findByName('admin', self::GUARD);
        $admin->syncPermissions([
            'projects.viewAny', 'projects.view', 'projects.create', 'projects.update', 'projects.edit', 'projects.delete', 'projects.export',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit', 'tasks.delete', 'tasks.assign', 'tasks.export',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete', 'suppliers.approve', 'suppliers.export',
            'comments.viewAny', 'comments.view', 'comments.create', 'comments.delete',
            'notifications.viewAny', 'notifications.markRead',
            'finance.viewAny', 'finance.view', 'finance.export',
            'members.viewAny', 'members.manage',
            'audit.viewAny',
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'settings.manage',
            'company.branding.manage',
            'categories.manage',
            'capabilities.manage',
            'certifications.manage',
            'contract.manage', 'contract.terminate',
            'contract.variation.create', 'contract.variation.approve',
            'contract.invoice.create', 'contract.invoice.approve', 'contract.invoice.pay',
        ]);

        $procurementManager = Role::findByName('procurement_manager', self::GUARD);
        $procurementManager->syncPermissions([
            'projects.viewAny', 'projects.view', 'projects.create', 'projects.update', 'projects.edit', 'projects.export',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit', 'tasks.assign', 'tasks.export',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.export', 'suppliers.approve',
            'comments.viewAny', 'comments.view', 'comments.create', 'comments.delete',
            'notifications.viewAny', 'notifications.markRead',
            'finance.viewAny', 'finance.view', 'finance.export',
            'members.viewAny',
            'audit.viewAny',
            'users.view',
            'boq.view', 'boq.import', 'boq.edit', 'boq.activate_version', 'boq.export',
            'projects.systems.view', 'projects.systems.create', 'projects.systems.edit',
            'projects.packages.view', 'projects.packages.create', 'projects.packages.edit',
            'pr.view', 'pr.create', 'pr.submit', 'pr.approve', 'pr.reject', 'pr.convert_to_rfq',
            'margin.view_exceptions', 'margin.request_exception',
            'rfq.view', 'rfq.create', 'rfq.issue', 'rfq.evaluate', 'rfq.award', 'rfq.close',
            'contract.manage', 'contract.terminate',
            'contract.variation.create', 'contract.variation.approve',
            'contract.invoice.create', 'contract.invoice.approve', 'contract.invoice.pay',
        ]);

        $procurementOfficer = Role::findByName('procurement_officer', self::GUARD);
        $procurementOfficer->syncPermissions([
            'projects.viewAny', 'projects.view',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit',
            'suppliers.view', 'suppliers.export',
            'comments.viewAny', 'comments.view', 'comments.create',
            'notifications.viewAny', 'notifications.markRead',
            'boq.view',
            'projects.systems.view',
            'projects.packages.view',
            'pr.view', 'pr.create', 'pr.submit',
            'rfq.view', 'rfq.create',
        ]);

        $evaluator = Role::findByName('evaluator', self::GUARD);
        $evaluator->syncPermissions([
            'projects.viewAny', 'projects.view',
            'tasks.viewAny', 'tasks.view',
            'comments.viewAny', 'comments.view', 'comments.create',
            'notifications.viewAny', 'notifications.markRead',
            'boq.view',
            'projects.systems.view',
            'projects.packages.view',
            'pr.view',
            'rfq.view', 'rfq.evaluate',
        ]);

        $technicalManager = Role::findByName('technical_manager', self::GUARD);
        $technicalManager->syncPermissions([
            'projects.viewAny', 'projects.view', 'projects.create', 'projects.update', 'projects.edit',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit', 'tasks.assign',
            'suppliers.view',
            'comments.viewAny', 'comments.view', 'comments.create', 'comments.delete',
            'notifications.viewAny', 'notifications.markRead',
            'users.view',
            'boq.view',
            'projects.systems.view',
            'projects.packages.view',
            'pr.view',
            'rfq.view', 'rfq.evaluate',
        ]);

        $projectManager = Role::findByName('project_manager', self::GUARD);
        $projectManager->syncPermissions([
            'projects.viewAny', 'projects.view', 'projects.create', 'projects.update', 'projects.edit', 'projects.export',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit', 'tasks.assign', 'tasks.export',
            'comments.viewAny', 'comments.view', 'comments.create', 'comments.delete',
            'notifications.viewAny', 'notifications.markRead',
            'finance.viewAny', 'finance.view',
            'members.viewAny',
            'users.view',
            'boq.view',
            'projects.systems.view', 'projects.systems.create',
            'projects.packages.view', 'projects.packages.create',
            'pr.view', 'pr.create', 'pr.submit',
            'rfq.view',
        ]);

        $member = Role::findByName('member', self::GUARD);
        $member->syncPermissions([
            'projects.viewAny', 'projects.view',
            'tasks.viewAny', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.edit',
            'comments.viewAny', 'comments.view', 'comments.create',
            'notifications.viewAny', 'notifications.markRead',
            'boq.view',
            'projects.systems.view',
            'projects.packages.view',
            'pr.view', 'pr.create', 'pr.submit',
            'rfq.view',
        ]);

        $viewer = Role::findByName('viewer', self::GUARD);
        $viewer->syncPermissions([
            'projects.viewAny', 'projects.view',
            'tasks.viewAny', 'tasks.view',
            'comments.viewAny', 'comments.view',
            'notifications.viewAny',
            'boq.view',
            'projects.systems.view',
            'projects.packages.view',
            'pr.view',
            'rfq.view',
        ]);

        $supplierRole = Role::findByName('supplier', self::GUARD);
        $supplierRole->syncPermissions(['rfq.submit_quote']);
    }
}
