import { useLocale } from '@/hooks/useLocale';

interface Props {
    status: string;
    entity: 'package' | 'rfq';
    size?: 'sm' | 'md';
}

const PACKAGE_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    under_review: 'bg-blue-100 text-blue-700',
    approved_for_rfq: 'bg-green-100 text-green-700',
    rfq_in_progress: 'bg-indigo-100 text-indigo-700',
    evaluation: 'bg-purple-100 text-purple-700',
    awarded: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-200 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
};

const RFQ_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    internally_approved: 'bg-green-100 text-green-700',
    issued: 'bg-blue-100 text-blue-700',
    supplier_questions_open: 'bg-amber-100 text-amber-700',
    responses_received: 'bg-cyan-100 text-cyan-700',
    under_evaluation: 'bg-purple-100 text-purple-700',
    recommended: 'bg-violet-100 text-violet-700',
    awarded: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-200 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
};

export function StatusBadge({ status, entity, size = 'md' }: Props) {
    const { t } = useLocale();
    const colors = entity === 'package' ? PACKAGE_COLORS : RFQ_COLORS;
    const colorClass = colors[status] ?? 'bg-gray-100 text-gray-600';
    const ns = entity === 'package' ? 'packages' : 'rfqs';
    const labelKey = `status_${status}`;
    const translated = t(labelKey, ns);
    const label =
        translated && translated !== labelKey
            ? translated
            : status.replace(/_/g, ' ');

    const paddingClass =
        size === 'sm'
            ? 'px-2 py-0.5 text-[11px]'
            : 'px-2.5 py-0.5 text-xs';

    return (
        <span
            className={`inline-flex items-center rounded-full font-medium ${paddingClass} ${colorClass}`}
        >
            {label}
        </span>
    );
}

