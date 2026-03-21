/** Keys aligned with App\Models\TaskLink::ALLOWED_TYPES */
export const TASK_LINK_TYPE_KEYS = [
    'project',
    'supplier',
    'rfq',
    'package',
    'contract',
    'purchase_request',
] as const;

export type TaskLinkTypeKey = (typeof TASK_LINK_TYPE_KEYS)[number];

/** Reverse map from Eloquent morph class → short type key (for forms / API). */
export const TASK_LINK_CLASS_TO_TYPE: Record<string, TaskLinkTypeKey> = {
    'App\\Models\\Project': 'project',
    'App\\Models\\Supplier': 'supplier',
    'App\\Models\\Rfq': 'rfq',
    'App\\Models\\ProcurementPackage': 'package',
    'App\\Models\\Contract': 'contract',
    'App\\Models\\PurchaseRequest': 'purchase_request',
};

export function taskLinkTypeFromClass(linkableType: string): TaskLinkTypeKey | null {
    return TASK_LINK_CLASS_TO_TYPE[linkableType] ?? null;
}

/** Best-effort label for polymorphic linkable payloads from the API. */
export function linkableSummaryLabel(linkable: Record<string, unknown> | null | undefined): string {
    if (!linkable || typeof linkable !== 'object') {
        return '';
    }
    const o = linkable as Record<string, unknown>;
    const candidates = [
        o.name,
        o.title,
        o.legal_name_en,
        o.trade_name,
        o.rfq_number,
        o.pr_number,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim() !== '') {
            return c;
        }
    }
    return String(o.id ?? '');
}

/** Resolve a navigable href for a linked entity when the app route is known. */
export function taskLinkHref(
    type: TaskLinkTypeKey,
    linkableId: string,
    linkable?: Record<string, unknown> | null
): string | null {
    try {
        switch (type) {
            case 'project':
                return route('projects.show', linkableId);
            case 'supplier':
                return route('suppliers.show', linkableId);
            case 'rfq':
                return route('rfqs.show', linkableId);
            case 'contract':
                return route('contracts.show', linkableId);
            case 'purchase_request':
                return route('purchase-requests.show', linkableId);
            case 'package': {
                const projectId =
                    linkable && typeof linkable.project_id === 'string'
                        ? linkable.project_id
                        : null;
                if (!projectId) {
                    return null;
                }
                return route('projects.procurement-packages.show', [projectId, linkableId]);
            }
            default:
                return null;
        }
    } catch {
        return null;
    }
}
