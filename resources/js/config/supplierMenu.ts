import { Bell, Building2, ClipboardList, FileText, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import type { SidebarMenuItem } from '@/Components/layout/Sidebar';

export interface SupplierMenuEntry {
    labelKey: string;
    label?: string;
    icon: SidebarMenuItem['icon'];
    routeName: string;
}

export const supplierMenu: SupplierMenuEntry[] = [
    { labelKey: 'nav_dashboard', label: 'Dashboard', icon: LayoutDashboard, routeName: 'supplier.dashboard' },
    { labelKey: 'nav_notifications', label: 'Notifications', icon: Bell, routeName: 'supplier.notifications.index' },
    {
        labelKey: 'nav_notification_preferences',
        label: 'Notification preferences',
        icon: SlidersHorizontal,
        routeName: 'notification-preferences.index',
    },
    { labelKey: 'supplier_profile', icon: Building2, routeName: 'supplier.profile' },
    { labelKey: 'nav_rfqs', label: 'RFQs', icon: ClipboardList, routeName: 'supplier.rfqs.index' },
    { labelKey: 'nav_purchase_requests', label: 'Quotations', icon: FileText, routeName: 'supplier.quotations.index' },
];
