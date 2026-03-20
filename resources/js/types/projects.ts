export type ProjectStatus = 'active' | 'archived' | 'on_hold';

export interface Project {
    id: string;
    name: string;
    code?: string | null;
    name_en?: string | null;
    name_ar?: string | null;
    description: string | null;
    client?: string | null;
    currency?: string | null;
    contract_value?: string | number | null;
    planned_margin_pct?: string | number | null;
    min_margin_pct?: string | number | null;
    status: ProjectStatus;
    start_date: string | null;
    end_date: string | null;
    owner_user_id: number;
    owner?: { id: number; name: string };
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface ProjectFilters {
    q?: string;
    status?: ProjectStatus;
    owner_id?: string;
    date_from?: string;
    date_to?: string;
    sort_field?: string;
    sort_dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
}
