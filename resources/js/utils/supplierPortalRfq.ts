/**
 * Translation key under supplier_portal for RFQ lifecycle statuses (snake_case DB values).
 */
export function supplierPortalRfqStatusKey(status: string): string {
    return `status_rfq_${status.replace(/-/g, '_')}`;
}
