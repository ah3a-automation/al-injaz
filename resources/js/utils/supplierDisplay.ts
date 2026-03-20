export type SupplierNameLike = {
    legal_name_en?: string | null;
    legal_name_ar?: string | null;
};

export function getLocalizedSupplierName(
    supplier: SupplierNameLike | null | undefined,
    locale: string
): string {
    if (!supplier) return '';

    const en = supplier.legal_name_en?.trim() || '';
    const ar = supplier.legal_name_ar?.trim() || '';

    return locale === 'ar' ? ar || en : en || ar;
}

