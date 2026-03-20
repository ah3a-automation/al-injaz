export interface RfqItem {
    id: string;
    code: string | null;
    description_en: string;
    description_ar: string | null;
    unit: string | null;
    qty: string | null;
    estimated_cost: string;
    sort_order: number;
}

export interface ComparisonSupplier {
    id: string;
    rfq_quote_id: string;
    legal_name_en: string;
    supplier_code: string;
    total_rfq_items?: number;
    priced_items?: number;
    completeness_pct?: number;
    variance_pct?: number | null;
}

export interface ComparisonSummary {
    suppliers_invited: number;
    suppliers_responded: number;
    lowest_total_supplier_id: string | null;
    highest_total_supplier_id: string | null;
    supplier_totals: Record<string, number>;
    total_estimated_cost?: number;
    total_rfq_items?: number;
    recommended_supplier_ids?: string[];
    is_tie?: boolean;
}

export interface RfqEvaluationRow {
    id: string;
    supplier_id: string;
    evaluator_id: number;
    price_score: number;
    technical_score: number;
    commercial_score: number;
    total_score: number;
    comments: string | null;
    created_at: string | null;
    supplier: { id: string; legal_name_en: string; supplier_code: string | null } | null;
    evaluator: { id: number; name: string } | null;
}
