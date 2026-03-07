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

export interface SharedPageProps {
    auth: { user: { id: number; name: string; email: string; email_verified_at: string | null } | null }
    can?: { 'users.view'?: boolean; 'settings.manage'?: boolean }
    locale: string
    dir: 'ltr' | 'rtl'
    notifications: {
        unread_count: number
    }
    flash: {
        success: string | null
        error: string | null
    }
    userCan?: {
        'users.view'?: boolean;
        'settings.manage'?: boolean;
        'suppliers.create'?: boolean;
    };
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
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
}

export interface SupplierCapability {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    category_id: number;
    category?: { id: number; name: string };
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
}

export interface SupplierDocument {
    id: string;
    supplier_id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    expiry_date: string | null;
    is_mandatory: boolean;
    uploaded_by_user_id: number | null;
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
