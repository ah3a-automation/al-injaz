export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface UserRecord {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    department: string | null;
    avatar_path: string | null;
    status: 'active' | 'inactive' | 'suspended';
    must_change_password: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    roles: Array<{ id: number; name: string }>;
    creator?: { id: number; name: string };
    createdUsers?: Array<{ id: number; name: string; email: string }>;
}

export interface PaginatedUsers {
    data: UserRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface AppNotification {
    id: string
    type: string
    data: {
        event_code: string
        type: 'info' | 'success' | 'warning' | 'danger'
        title: string
        body: string
        link: string | null
    }
    read_at: string | null
    created_at: string
}

export interface PaginatedNotifications {
    data: AppNotification[]
    current_page: number
    last_page: number
    total: number
    per_page: number
    from: number | null
    to: number | null
    links: Array<{ url: string | null; label: string; active: boolean }>
}

export interface MailSettings {
    mail_host: string;
    mail_port: string;
    mail_username: string;
    mail_password: string;
    mail_encryption: string;
    mail_from_name: string;
    mail_from_email: string;
}

export interface Company {
    name_en: string | null;
    name_ar: string | null;
    short_name_en: string | null;
    short_name_ar: string | null;
    display_name: string;
    display_short_name: string;
    logo_light: string | null;
    logo_dark: string | null;
    sidebar_icon: string | null;
    favicon: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    sidebar_brand_mode: 'logo' | 'text' | 'logo_text';
    brand_primary_color: string | null;
    brand_secondary_color: string | null;
    color_success: string | null;
    color_warning: string | null;
    color_danger: string | null;
    color_info: string | null;
    color_sidebar_bg: string | null;
    color_sidebar_text: string | null;
}

export interface NotificationPreferenceChannelState {
    enabled: boolean;
    admin_allows: boolean;
}

export interface NotificationPreferenceRow {
    event_key: string;
    event_name: string;
    channels: {
        inapp?: NotificationPreferenceChannelState;
        email?: NotificationPreferenceChannelState;
        whatsapp?: NotificationPreferenceChannelState;
    };
}

export interface SharedPageProps {
    /** Runtime Reverb / Echo settings (browser-reachable host; overrides VITE_* when present). */
    reverb?: {
        key: string;
        host: string;
        port: number;
        scheme: 'http' | 'https';
    } | null;
    company?: Company;
    auth: { user: { id: number; name: string; email: string; email_verified_at: string | null; avatar_url: string | null } | null }
    can?: { 'users.view'?: boolean; 'settings.manage'?: boolean }
    locale: string
    dir: 'ltr' | 'rtl'
    notifications: {
        unread_count: number
    }
    flash: {
        success: string | null
        error: string | null
        warning?: string | null
        scroll_to?: string | null
    }
    /** Inertia form validation errors */
    errors?: Record<string, string>
    userCan?: {
        'users.view'?: boolean;
        'settings.manage'?: boolean;
        'suppliers.create'?: boolean;
        'contract.manage'?: boolean;
        'contract.variation.approve'?: boolean;
        'contract.invoice.approve'?: boolean;
        'contract.invoice.pay'?: boolean;
        'company.branding.manage'?: boolean;
        'categories.manage'?: boolean;
        'capabilities.manage'?: boolean;
        'certifications.manage'?: boolean;
        [key: string]: boolean | undefined;
    };
    /** Supplier portal: unread count for SystemNotification (status !== 'read') */
    unreadNotificationsCount?: number;
    /** Supplier portal: up to 5 most recent notifications for bell dropdown */
    recentNotifications?: Array<{
        id: string;
        event_key: string;
        title: string;
        message: string;
        link: string | null;
        isUnread: boolean;
        timeAgo: string;
    }>;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & SharedPageProps;

export interface TaskAssignee {
    id: number;
    name: string;
    pivot: { role: 'responsible' | 'reviewer' | 'watcher' };
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: number;
    body: string;
    created_at: string;
    user?: { id: number; name: string };
}

export interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number | null;
    created_at: string;
    uploader?: { id: number; name: string };
}

export interface Task {
    id: string;
    project_id: string | null;
    parent_task_id: string | null;
    created_by_user_id: number;
    title: string;
    description: string | null;
    status: 'backlog' | 'open' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_at: string | null;
    start_at: string | null;
    completed_at: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    progress_percent: number;
    position: number;
    visibility: string;
    source: string;
    created_at: string;
    updated_at: string;
    project?: { id: string; name: string };
    creator?: { id: number; name: string };
    assignees?: TaskAssignee[];
    subtasks?: Task[];
    comments?: TaskComment[];
    attachments?: TaskAttachment[];
}

export interface PaginatedTasks {
    data: Task[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface SupplierCategory {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    level?: number;
    supplier_type?: string;
    is_active?: boolean;
}

export interface SupplierCapability {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    category_id: string;
    category?: { id: string; code: string; name_en: string; name_ar: string };
    description: string | null;
    is_active: boolean;
    sort_order: number;
    pivot?: {
        proficiency_level: 'basic' | 'standard' | 'advanced' | 'expert';
        years_experience: number | null;
    };
}

export interface Certification {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    issuing_body: string | null;
    description: string | null;
    requires_expiry: boolean;
    is_active: boolean;
    pivot?: {
        certificate_number: string | null;
        issued_at: string | null;
        expires_at: string | null;
        is_verified: boolean;
    };
}

export interface SupplierZone {
    id: number;
    supplier_id: string;
    zone_code: string;
    zone_name: string;
    city_name: string | null;
    city_code: string | null;
    covers_entire_zone: boolean;
}

export interface SupplierContact {
    id: string;
    supplier_id: string;
    name: string;
    job_title: string | null;
    department: string | null;
    contact_type: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    is_primary: boolean;
    notes: string | null;
    avatar_url?: string | null;
    business_card_front_url?: string | null;
    business_card_back_url?: string | null;
}

export interface SupplierDocument {
    id: string;
    supplier_id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    mime_type?: string | null;
    expiry_date: string | null;
    is_mandatory: boolean;
    uploaded_by_user_id: number | null;
    version?: number;
    is_current?: boolean;
    created_at?: string;
    source?: string | null;
    preview_url?: string | null;
    download_url?: string | null;
    remaining_days?: number | null;
    expiry_status?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' | null;
}

export interface Supplier {
    id: string;
    supplier_code: string;
    legal_name_en: string;
    legal_name_ar: string | null;
    trade_name: string | null;
    supplier_type: string;
    country: string;
    city: string;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    status: string;
    is_verified: boolean;
    compliance_status: string;
    commercial_registration_no: string | null;
    cr_expiry_date: string | null;
    vat_number: string | null;
    vat_expiry_date?: string | null;
    unified_number: string | null;
    business_license_number: string | null;
    license_expiry_date: string | null;
    chamber_of_commerce_number: string | null;
    classification_grade: string | null;
    bank_name: string | null;
    bank_country: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    iban: string | null;
    swift_code: string | null;
    preferred_currency: string | null;
    payment_terms_days: number | null;
    credit_limit: number | null;
    tax_withholding_rate: number | null;
    risk_score: number | null;
    notes: string | null;
    registration_token: string | null;
    registration_token_expires_at: string | null;
    approved_at: string | null;
    approved_by_user_id: number | null;
    rejected_at: string | null;
    rejected_by_user_id: number | null;
    rejection_reason: string | null;
    approval_notes: string | null;
    more_info_notes: string | null;
    suspended_at: string | null;
    blacklisted_at: string | null;
    supplier_user_id: number | null;
    created_at: string;
    updated_at: string;
    creator?: { id: number; name: string };
    approver?: { id: number; name: string };
    rejector?: { id: number; name: string };
    supplier_user?: { id: number; name: string; email: string; status: string };
    categories?: SupplierCategory[];
    capabilities?: SupplierCapability[];
    certifications?: Certification[];
    zones?: SupplierZone[];
    max_contract_value: number | null;
    workforce_size: number | null;
    equipment_list: string | null;
    capacity_notes: string | null;
    capacity_updated_at: string | null;
    primary_contact?: SupplierContact | null;
    contacts?: SupplierContact[];
    documents?: SupplierDocument[];
}

export interface PaginatedSuppliers {
    data: Supplier[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface GlobalSearchPreview {
    title?: string;
    status?: string;
    project_manager?: string;
    rfq_count?: number;
    categories?: string;
    city?: string;
    rfq_invitations?: number;
    rfq_number?: string;
    project?: string;
    closing_date?: string;
}

export interface GlobalSearchItem {
    type: string;
    id: string;
    label: string;
    description: string;
    url: string;
    icon: string;
    /** Secondary context line, e.g. "Project • Active" */
    breadcrumbs?: string;
    status?: string;
    project_name?: string;
    preview?: GlobalSearchPreview;
}

export interface GlobalSearchCommand {
    type: 'command';
    id: string;
    label: string;
    description: string;
    url: string;
    icon: string;
}

export interface GlobalSearchRecentOrFavorite {
    id: number;
    type: string;
    model_id: string;
    label: string;
    url: string;
    icon: string;
}

export interface GlobalSearchResponse {
    results: {
        projects: GlobalSearchItem[];
        suppliers: GlobalSearchItem[];
        rfqs: GlobalSearchItem[];
        contracts: GlobalSearchItem[];
        settings: GlobalSearchItem[];
    };
    recent: GlobalSearchRecentOrFavorite[];
    favorites: GlobalSearchRecentOrFavorite[];
    commands: GlobalSearchCommand[];
}
