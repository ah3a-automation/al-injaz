import { Link } from '@inertiajs/react';

interface ProjectNavTabsProps {
    project: { id: string; name?: string; name_en?: string | null };
    activeTab: 'overview' | 'procurement-packages' | 'rfqs' | 'contracts';
}

export function ProjectNavTabs({ project, activeTab }: ProjectNavTabsProps) {
    const tab = (key: ProjectNavTabsProps['activeTab'], label: string, href: string | null) => {
        const isActive = activeTab === key;
        const className = isActive
            ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground'
            : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground';
        if (href) {
            return (
                <Link key={key} href={href} className={className}>
                    {label}
                </Link>
            );
        }
        return (
            <span key={key} className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground/70 cursor-not-allowed">
                {label}
            </span>
        );
    };

    return (
        <nav className="flex gap-1 border-b border-border" aria-label="Project sections">
            {tab('overview', 'Overview', route('projects.show', project.id))}
            {tab('procurement-packages', 'Procurement Packages', route('projects.procurement-packages.index', project.id))}
            {tab('rfqs', 'RFQs', route('projects.rfqs.index', project.id))}
            {tab('contracts', 'Contracts', null)}
        </nav>
    );
}
