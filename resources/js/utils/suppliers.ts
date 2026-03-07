import type { Supplier } from '@/types';

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending_registration: 'Pending Registration',
        pending_review: 'Pending Review',
        under_review: 'Under Review',
        more_info_requested: 'More Info Requested',
        approved: 'Approved',
        rejected: 'Rejected',
        suspended: 'Suspended',
        blacklisted: 'Blacklisted',
    };
    return labels[status] ?? status;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending_registration: 'bg-amber-100 text-amber-800',
        pending_review: 'bg-yellow-100 text-yellow-700',
        under_review: 'bg-blue-100 text-blue-800',
        more_info_requested: 'bg-orange-100 text-orange-700',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-700',
        suspended: 'bg-orange-100 text-orange-800',
        blacklisted: 'bg-red-100 text-red-800',
    };
    return colors[status] ?? 'bg-muted text-muted-foreground';
}

export function canPerformAction(
    status: Supplier['status'],
    action: string
): boolean {
    const transitions: Record<string, string[]> = {
        pending_registration: ['approve', 'reject', 'request_info'],
        pending_review: ['approve', 'reject', 'request_info'],
        under_review: ['approve', 'reject', 'request_info'],
        more_info_requested: ['approve', 'reject'],
        approved: ['suspend', 'blacklist'],
        suspended: ['reactivate', 'blacklist'],
        rejected: ['approve'],
        blacklisted: ['reactivate'],
    };
    return (transitions[status] ?? []).includes(action);
}

export function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        supplier: 'Supplier',
        subcontractor: 'Subcontractor',
        service_provider: 'Service Provider',
        consultant: 'Consultant',
    };
    return labels[type] ?? type;
}

export function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
        supplier: 'bg-slate-100 text-slate-800',
        subcontractor: 'bg-indigo-100 text-indigo-800',
        service_provider: 'bg-cyan-100 text-cyan-800',
        consultant: 'bg-violet-100 text-violet-800',
    };
    return colors[type] ?? 'bg-muted text-muted-foreground';
}

export function getComplianceColor(compliance: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-800',
        verified: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return colors[compliance] ?? 'bg-muted text-muted-foreground';
}

export function formatCurrency(
    value: number | null | undefined,
    currency: string = 'SAR'
): string {
    if (value == null) return '—';
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

const MANDATORY_TYPES = [
    'commercial_registration',
    'unified_number',
    'vat_certificate',
    'national_address',
];

export function getMandatoryDocumentStatus(documents: { document_type: string }[] | undefined): {
    complete: boolean;
    missing: string[];
} {
    const present = new Set((documents ?? []).map((d) => d.document_type));
    const missing = MANDATORY_TYPES.filter((t) => !present.has(t));
    return {
        complete: missing.length === 0,
        missing,
    };
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

export function isValidSaudiIBAN(iban: string): boolean {
    return iban.startsWith('SA') && iban.length === 24;
}

export const SAUDI_ZONES: Record<string, string> = {
    RYD: 'Riyadh',
    JED: 'Makkah / Jeddah',
    DAM: 'Eastern Province / Dammam',
    MED: 'Madinah',
    ABH: 'Asir / Abha',
    TAI: 'Taif',
    BUR: 'Al-Qassim / Buraydah',
    HAI: 'Hail',
    JAZ: 'Jizan',
    NAJ: 'Najran',
    JOF: 'Al-Jouf',
    NOR: 'Northern Borders',
    BAH: 'Al-Bahah',
};

export const PROFICIENCY_LEVELS = ['basic', 'standard', 'advanced', 'expert'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export function getProficiencyColor(level: ProficiencyLevel): string {
    const map: Record<ProficiencyLevel, string> = {
        basic: 'bg-gray-100 text-gray-700',
        standard: 'bg-blue-100 text-blue-700',
        advanced: 'bg-purple-100 text-purple-700',
        expert: 'bg-amber-100 text-amber-700',
    };
    return map[level] ?? 'bg-gray-100 text-gray-700';
}

export function getProficiencyLabel(level: ProficiencyLevel): string {
    const map: Record<ProficiencyLevel, string> = {
        basic: 'Basic',
        standard: 'Standard',
        advanced: 'Advanced',
        expert: 'Expert',
    };
    return map[level] ?? level;
}
