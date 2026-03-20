import {
    BarChart3,
    Building2,
    CheckSquare,
    ClipboardCheck,
    ClipboardList,
    Download,
    FileText,
    FileSpreadsheet,
    FolderKanban,
    LayoutDashboard,
    LayoutGrid,
    Mail,
    MapPin,
    Settings,
    Shield,
    ShoppingCart,
    Users,
} from 'lucide-react';
import type { SidebarMenuItem } from '@/Components/layout/Sidebar';

export interface AdminMenuEntry {
    labelKey: string;
    label?: string;
    icon: SidebarMenuItem['icon'];
    routeName: string;
    routeParams?: Record<string, unknown>;
    permission?: string;
}

export const adminMenu: AdminMenuEntry[] = [
    { labelKey: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
    { labelKey: 'projects', label: 'Projects', icon: FolderKanban, routeName: 'projects.index' },
    { labelKey: 'boq_import', label: 'BOQ Import', icon: FileSpreadsheet, routeName: 'boq-import.index' },
    { labelKey: 'tasks', label: 'Tasks', icon: CheckSquare, routeName: 'tasks.index' },
    { labelKey: 'suppliers', label: 'Suppliers', icon: Building2, routeName: 'suppliers.index' },
    { labelKey: 'coverage_map', label: 'Coverage Map', icon: MapPin, routeName: 'admin.suppliers.map' },
    { labelKey: 'supplier_intelligence', label: 'Supplier Intelligence', icon: BarChart3, routeName: 'supplier-intelligence.index' },
    { labelKey: 'purchase_requests', label: 'Purchase Requests', icon: ShoppingCart, routeName: 'purchase-requests.index' },
    { labelKey: 'rfqs', label: 'RFQs', icon: ClipboardList, routeName: 'rfqs.index' },
    { labelKey: 'evaluations', label: 'Evaluations', icon: ClipboardCheck, routeName: 'rfqs.index', routeParams: { status: 'under_evaluation' } },
    { labelKey: 'contracts', label: 'Contracts', icon: FileText, routeName: 'contracts.index', permission: 'contract.manage' },
    { labelKey: 'contract_articles', label: 'Contract Articles', icon: FileText, routeName: 'contract-articles.index', permission: 'contract.manage' },
    { labelKey: 'contract_templates', label: 'Contract Templates', icon: FileText, routeName: 'contract-templates.index', permission: 'contract.manage' },
    { labelKey: 'exports', label: 'Exports', icon: Download, routeName: 'exports.index' },
    // Settings cluster
    { labelKey: 'settings', label: 'Settings', icon: Settings, routeName: 'settings.mail', permission: 'settings.manage' },
    { labelKey: 'nav_mail_configuration', label: 'Mail Configuration', icon: Mail, routeName: 'settings.mail', permission: 'settings.manage' },
    { labelKey: 'user_roles', label: 'User Roles', icon: Shield, routeName: 'settings.roles.index', permission: 'settings.manage' },
    { labelKey: 'permissions_matrix', label: 'Permissions Matrix', icon: LayoutGrid, routeName: 'settings.roles.audit', permission: 'settings.manage' },
    { labelKey: 'nav_notification_configuration', label: 'Notification Configuration', icon: ClipboardCheck, routeName: 'settings.notification-configuration.index', permission: 'settings.manage' },
    { labelKey: 'nav_notification_settings', label: 'Notification Settings', icon: ClipboardList, routeName: 'settings.notifications.index', permission: 'settings.manage' },
    { labelKey: 'nav_notification_history', label: 'Notification History', icon: ClipboardList, routeName: 'settings.notifications.history', permission: 'settings.manage' },
    { labelKey: 'users', label: 'Users', icon: Users, routeName: 'settings.users.index', permission: 'users.view' },
    { labelKey: 'company_branding_title', label: 'Company Branding', icon: Building2, routeName: 'settings.company-branding', permission: 'company.branding.manage' },
    { labelKey: 'categories', label: 'Categories', icon: Shield, routeName: 'settings.supplier-categories.index', permission: 'categories.manage' },
    { labelKey: 'ai_category_suggestions', label: 'AI Category Suggestions', icon: Shield, routeName: 'settings.ai-category-suggestions', permission: 'settings.manage' },
    { labelKey: 'capabilities', label: 'Capabilities', icon: Shield, routeName: 'settings.supplier-capabilities.index', permission: 'capabilities.manage' },
    { labelKey: 'certifications', label: 'Certifications', icon: Shield, routeName: 'settings.certifications.index', permission: 'certifications.manage' },
];
