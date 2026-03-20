import { Building2, FileText, FolderKanban } from 'lucide-react';
import type { GlobalSearchItem, GlobalSearchPreview, GlobalSearchRecentOrFavorite } from '@/types';

interface SearchPreviewProps {
    /** Result item (project, supplier, rfq) with preview data */
    item: GlobalSearchItem | GlobalSearchRecentOrFavorite | null;
    /** For recent/favorite we only show label and url */
    type?: 'result' | 'recent' | 'favorite' | 'command';
}

function ProjectPreview({ preview }: { preview: GlobalSearchPreview }) {
    return (
        <div className="space-y-2 text-sm">
            {preview.status != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span>{preview.status}</span>
                </div>
            )}
            {preview.project_manager != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Project Manager</span>
                    <span>{preview.project_manager || '—'}</span>
                </div>
            )}
            {preview.rfq_count != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">RFQ Count</span>
                    <span>{preview.rfq_count}</span>
                </div>
            )}
        </div>
    );
}

function SupplierPreview({ preview }: { preview: GlobalSearchPreview }) {
    return (
        <div className="space-y-2 text-sm">
            {preview.categories != null && preview.categories !== '' && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Categories</span>
                    <span className="truncate">{preview.categories}</span>
                </div>
            )}
            {preview.city != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">City</span>
                    <span>{preview.city || '—'}</span>
                </div>
            )}
            {preview.rfq_invitations != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">RFQ Invitations</span>
                    <span>{preview.rfq_invitations}</span>
                </div>
            )}
        </div>
    );
}

function RfqPreview({ preview }: { preview: GlobalSearchPreview }) {
    return (
        <div className="space-y-2 text-sm">
            {preview.rfq_number != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">RFQ Number</span>
                    <span>{preview.rfq_number}</span>
                </div>
            )}
            {preview.status != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span>{preview.status}</span>
                </div>
            )}
            {preview.project != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Project</span>
                    <span>{preview.project}</span>
                </div>
            )}
            {preview.closing_date != null && (
                <div className="flex gap-2">
                    <span className="text-muted-foreground">Closing Date</span>
                    <span>{preview.closing_date}</span>
                </div>
            )}
        </div>
    );
}

export default function SearchPreview({ item, type = 'result' }: SearchPreviewProps) {
    if (!item) {
        return (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                Select a result to preview
            </div>
        );
    }

    const label = item.label;
    const icon = 'icon' in item ? item.icon : 'circle';
    const preview = 'preview' in item ? (item as GlobalSearchItem).preview : undefined;

    const Icon =
        icon === 'folder' || icon === 'project'
            ? FolderKanban
            : icon === 'building' || icon === 'supplier'
              ? Building2
              : FileText;

    if (type === 'command' || type === 'recent' || type === 'favorite' || !preview) {
        return (
            <div className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {label}
                </div>
                {'description' in item && (item as GlobalSearchItem).description && (
                    <p className="mt-1 text-xs text-muted-foreground">{(item as GlobalSearchItem).description}</p>
                )}
            </div>
        );
    }

    const itemType = 'type' in item ? item.type : '';
    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{preview.title ?? label}</span>
            </div>
            {itemType === 'project' && <ProjectPreview preview={preview} />}
            {itemType === 'supplier' && <SupplierPreview preview={preview} />}
            {itemType === 'rfq' && <RfqPreview preview={preview} />}
        </div>
    );
}
