import { PanelLeft } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { Button } from '@/Components/ui/button';

export function SidebarToggle() {
    const { collapsed, toggle } = useSidebar();

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
        >
            <PanelLeft className="h-5 w-5" />
        </Button>
    );
}
