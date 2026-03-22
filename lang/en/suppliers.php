<?php

declare(strict_types=1);

return [
    // Page titles
    'title_index'          => 'Suppliers',
    'title_create'         => 'Add Supplier',
    'title_edit'           => 'Edit Supplier',
    'title_detail'         => 'Supplier Details',

    // Table columns
    'col_name'             => 'Name',
    'col_email'            => 'Email',
    'col_phone'            => 'Phone',
    'col_city'             => 'City',
    'col_category'         => 'Category',
    'col_status'           => 'Status',
    'col_registered'       => 'Registered',
    'col_actions'          => 'Actions',
    'col_score'            => 'Score',
    'col_capabilities'     => 'Capabilities',
    'col_certifications'   => 'Certifications',
    'col_contact'          => 'Contact Person',
    'col_location'         => 'Location',
    'col_compliance'       => 'Compliance',

    // Filters & search
    'search_placeholder'   => 'Search by name, email, or city...',
    'filter_status'        => 'Filter by status',
    'filter_category'      => 'Filter by category',
    'filter_city'          => 'Filter by city',
    'all_statuses'         => 'All statuses',
    'all_categories'       => 'All categories',
    'all_countries'        => 'All countries',
    'all_types'            => 'All types',
    'filter_type'          => 'Filter by type',
    'filter_country'       => 'Filter by country',

    // Status badges
    'status_pending'       => 'Pending',
    'status_approved'      => 'Approved',
    'status_rejected'      => 'Rejected',
    'status_suspended'     => 'Suspended',
    'status_active'        => 'Active',
    'status_inactive'      => 'Inactive',
    'status_pending_registration' => 'Pending Registration',
    'status_pending_review'       => 'Pending Review',
    'status_under_review'         => 'Under Review',
    'status_more_info_requested'  => 'More Info Requested',
    'status_blacklisted'          => 'Blacklisted',

    // Supplier types
    'type_supplier'        => 'Supplier',
    'type_subcontractor'   => 'Subcontractor',
    'type_service_provider'=> 'Service Provider',
    'type_consultant'      => 'Consultant',

    // Actions
    'action_view'          => 'View',
    'action_edit'          => 'Edit',
    'action_delete'        => 'Delete',
    'action_approve'       => 'Approve',
    'action_reject'        => 'Reject',
    'action_suspend'       => 'Suspend',
    'action_add'           => 'Add Supplier',
    'action_save'          => 'Save',
    'action_cancel'        => 'Cancel',
    'action_back'          => 'Back',
    'action_export'        => 'Export',
    'action_bulk_delete'   => 'Delete selected',

    // Form fields
    'field_name'           => 'Supplier Name',
    'field_email'          => 'Email Address',
    'field_phone'          => 'Phone Number',
    'field_city'           => 'City',
    'field_address'        => 'Address',
    'field_category'       => 'Category',
    'field_capabilities'   => 'Capabilities',
    'field_certifications' => 'Certifications',
    'field_contact_name'   => 'Contact Person Name',
    'field_contact_email'  => 'Contact Person Email',
    'field_contact_phone'  => 'Contact Person Phone',
    'field_notes'          => 'Notes',
    'field_website'        => 'Website',
    'field_cr_number'      => 'CR Number',
    'field_vat_number'     => 'VAT Number',

    // Additional sections and helpers
    'section_location'     => 'Location',
    'section_legal'        => 'Legal & Compliance',
    'section_financial'    => 'Financial',
    'section_notes'        => 'Notes',
    'company_info_help'    => 'Legal and trade names for the supplier.',
    'location_help'        => 'Country, city, and address details.',
    'contact_help'         => 'Phone, email, and website.',
    'categories_help'      => 'Select one or more categories.',
    'legal_help'           => 'CR number, VAT, licenses, and registration data.',
    'financial_help'       => 'Bank, payment terms, and risk information.',

    // Section headings in detail/form
    'section_basic'        => 'Basic Information',
    'section_contact'      => 'Contact Information',
    'section_documents'    => 'Documents',
    'section_performance'  => 'Performance',
    'section_activity'     => 'Activity',

    // Detail tabs
    'tab_basic'            => 'Basic Info',
    'tab_legal'            => 'Legal & Compliance',
    'tab_financial'        => 'Financial',
    'tab_categories'       => 'Categories',
    'tab_capabilities'     => 'Capabilities & Regions',

    // Capabilities / capacity sections
    'section_capabilities'     => 'Capabilities & Qualifications',
    'section_certifications'   => 'Certifications',
    'tab_capabilities'         => 'Capabilities',
    'tab_certifications'       => 'Certifications',
    'tab_zones'                => 'Service Zones',
    'tab_capacity'             => 'Capacity',
    'no_capabilities'          => 'No capabilities assigned',
    'no_certifications'        => 'No certifications',
    'no_zones'                 => 'No service zones defined',
    'capacity_title'           => 'Capacity (SAR)',
    'capacity_max_contract'    => 'Max Contract Value (SAR)',
    'capacity_workforce'       => 'Workforce Size',
    'capacity_workforce_value' => ':count employees',
    'capacity_equipment'       => 'Equipment List',
    'capacity_notes'           => 'Capacity Notes',
    'capacity_last_updated'    => 'Last updated: :date',
    'service_zones'            => 'Service Zones',

    // Capacity expiry badges
    'expired'              => 'Expired',
    'expiring_soon'        => 'Expiring soon :date',
    'valid_until'          => 'Valid until :date',

    // Legal fields extras
    'unified_number'       => 'Unified number',
    'business_license_number' => 'Business license number',
    'license_expiry'       => 'License expiry date',
    'chamber_of_commerce_number' => 'Chamber of commerce number',
    'classification_grade' => 'Classification grade',

    // Financial helpers
    'bank_name'            => 'Bank',
    'bank_country'         => 'Bank country',
    'bank_account_name'    => 'Bank account name',
    'bank_account_number'  => 'Bank account number',
    'bank_account'         => 'Bank account',
    'iban'                 => 'IBAN',
    'swift_code'           => 'SWIFT code',
    'payment_terms'        => 'Payment terms',
    'payment_terms_value'  => ':days days',
    'credit_limit'         => 'Credit limit',
    'tax_withholding'      => 'Tax withholding rate',
    'risk_score'           => 'Risk score',
    'no_financial_details' => 'No financial details.',

    // Supplier 360 section titles
    'legal_name_label'             => 'Legal name',
    'trade_name_label'             => 'Trade name',
    'section_executive_overview'   => 'Executive Overview',
    'section_company_summary'      => 'Company Summary',
    'approval_workflow_history'   => 'Approval & Workflow History',
    'section_legal_compliance'     => 'Legal & Compliance',
    'section_banking_snapshot'     => 'Banking & Finance',
    'add_document'                 => 'Add Document',
    'add_contact'                  => 'Add Contact',
    'section_categories_360'       => 'Categories',
    'category_level_label'         => 'Level :level',
    'category_level_other'         => 'Other',

    // Legal & Compliance section (Supplier 360)
    'compliance_tracked_items'     => 'Tracked items',
    'compliance_expired'            => 'Expired',
    'compliance_expiring_soon'      => 'Expiring soon',
    'compliance_missing'            => 'Missing',
    'compliance_expiry'             => 'Expiry',
    'compliance_days_remaining'     => ':days days left',
    'legal_item_cr'                => 'Commercial Registration',
    'legal_item_vat'               => 'VAT Registration',
    'legal_item_unified'           => 'Unified Number',
    'legal_item_business_license'  => 'Business License',
    'legal_item_chamber'           => 'Chamber of Commerce',
    'legal_item_classification'    => 'Classification Grade',
    'document_attached'            => 'Document attached',
    'status_missing'               => 'Missing',
    'status_expired'               => 'Expired',
    'status_expiring_soon'         => 'Expiring soon',
    'status_valid'                 => 'Valid',
    'status_info_only'             => 'Info only',

    // Banking section (Supplier 360)
    'bank_status'                  => 'Bank profile',
    'bank_status_complete'         => 'Complete',
    'bank_status_partial'          => 'Partial',
    'bank_status_missing'          => 'Missing',
    'bank_primary_currency'        => 'Primary currency',
    'bank_account_name_present'    => 'Account name present',
    'bank_iban_present'            => 'IBAN present',
    'bank_evidence_attached'       => 'Bank evidence',
    'bank_identity'                => 'Bank identity',
    'financial_snapshot'           => 'Financial snapshot',
    'bank_missing_core_warning'    => 'Core bank details are missing (bank name, account name, and IBAN/account number).',

    // Payment preferences section (Supplier 360)
    'section_payment_preferences'      => 'Payment Preferences',
    'payment_profile_status'          => 'Payment profile',
    'payment_status_complete'         => 'Complete',
    'payment_status_partial'          => 'Partial',
    'payment_status_missing'          => 'Missing',
    'payment_terms_present'           => 'Payment terms present',
    'credit_limit_present'            => 'Credit limit present',
    'credit_application_present'      => 'Credit application attached',
    'commercial_terms'                => 'Commercial terms',
    'payment_supporting_docs'         => 'Payment supporting documents',
    'no_credit_application'           => 'No credit application on file.',
    'payment_profile_incomplete_warning' => 'Payment preferences are incomplete. Confirm terms, limits, and credit application before handover.',

    // Approval history
    'approval_history'     => 'Approval History',
    'no_approval_history'  => 'No approval actions recorded yet.',
    'approved_by_on'       => 'Approved by :name on :date',
    'rejected_by_on'       => 'Rejected by :name on :date',
    'more_info_requested'  => 'More information requested',
    'suspended_on'         => 'Suspended on :date',
    'blacklisted_on'       => 'Blacklisted on :date',
    'unknown'              => 'Unknown',

    // Meta / quick stats
    'meta'                 => 'Meta',
    'verified'             => 'Verified',
    'yes'                  => 'Yes',
    'no'                   => 'No',
    'categories'           => 'Categories',
    'no_categories'        => 'No categories.',
    'quick_stats'          => 'Quick stats',
    'contacts_count'       => 'Contacts',
    'documents_count'      => 'Documents',
    'mandatory_docs'       => 'Mandatory docs',
    'complete'             => 'Complete',
    'incomplete'           => 'Incomplete',
    'missing_docs'         => 'Missing :list',

    // Contacts review section
    'section_contacts'             => 'Contacts',
    'primary_contact_present'      => 'Primary contact present',
    'finance_contact_present'      => 'Finance contact present',
    'technical_contact_present'    => 'Technical contact present',
    'sales_contact_present'        => 'Sales/Commercial contact present',
    'no_contacts_yet'              => 'No contacts yet.',
    'warning_no_primary_contact'   => 'No primary contact has been assigned.',
    'warning_no_finance_contact'   => 'No finance contact is defined.',
    'warning_no_technical_contact' => 'No technical contact is defined.',
    'warning_no_sales_contact'     => 'No sales/commercial contact is defined.',
    'primary'                      => 'Primary',

    // Executive overview intelligence
    'overview_compliance_readiness' => 'Compliance readiness',
    'overview_banking_readiness'    => 'Banking readiness',
    'overview_payment_readiness'    => 'Payment readiness',
    'overview_contact_coverage'     => 'Contact coverage',
    'overview_document_health'      => 'Document health',
    'overview_categories_assigned'  => 'Categories assigned',
    'overview_last_activity'        => 'Last activity',
    'readiness_ready'               => 'Ready',
    'readiness_needs_attention'     => 'Needs attention',
    'readiness_critical'            => 'Critical',
    'coverage_covered'              => 'Covered',
    'coverage_incomplete'           => 'Incomplete',
    'documents_healthy'             => 'Healthy',
    'documents_issues_found'        => 'Issues found',
    'none'                          => 'None',

    // Attention Required (Supplier 360)
    'attention_required'            => 'Attention Required',
    'attention_required_none'       => 'No immediate follow-up items.',
    'attention_required_more'       => 'Additional items are available in the sections below.',
    'alert_no_categories'           => 'No categories assigned',
    'alert_legal_expired'           => ':count legal item(s) expired',
    'alert_legal_expiring'          => ':count legal item(s) expiring soon',
    'alert_legal_missing'           => ':count legal item(s) missing',
    'alert_bank_missing'            => 'Banking profile missing',
    'alert_bank_incomplete'         => 'Banking profile incomplete',
    'alert_bank_no_evidence'        => 'No bank evidence document',
    'alert_payment_missing'         => 'Payment profile missing',
    'alert_payment_incomplete'      => 'Payment profile incomplete',
    'alert_payment_no_credit_app'   => 'No credit application attached',
    'alert_no_primary_contact'      => 'No primary contact assigned',
    'alert_no_finance_contact'      => 'No finance contact defined',
    'alert_no_technical_contact'    => 'No technical contact defined',
    'alert_no_sales_contact'        => 'No sales/commercial contact defined',
    'alert_docs_mandatory_missing'  => ':count mandatory document(s) missing',
    'alert_docs_expired'            => ':count document(s) expired',
    'alert_docs_expiring'           => ':count document(s) expiring soon',

    // Supplier 360 sticky nav
    'nav_overview'                  => 'Overview',
    'nav_categories'                => 'Categories',
    'nav_workflow'                  => 'Workflow',
    'nav_compliance'                => 'Compliance',
    'nav_banking'                   => 'Banking',
    'nav_payment'                   => 'Payment',
    'nav_documents'                 => 'Documents',
    'nav_contacts'                  => 'Contacts',
    'nav_capability'                => 'Capability',
    'nav_notes'                     => 'Notes',
    'nav_activity'                  => 'Activity',

    // Internal notes
    'section_internal_notes'       => 'Internal Notes',
    'no_internal_notes'            => 'No internal notes have been recorded for this supplier.',

    // Portal access
    'portal_access'        => 'Supplier Portal Access',
    'no_login'             => 'No login account created yet.',
    'login_failed'         => 'Login creation failed — check logs.',
    'user_status_active'   => 'Active',
    'user_status_suspended'=> 'Suspended',
    'user_status_inactive' => 'Inactive',
    'reset_login'          => 'Reset Login',
    'confirm_reset_login'  => 'Send a new set-password email to this supplier?',

    // Blacklist messages
    'blacklisted_notice'   => 'This supplier is blacklisted. Their CR number is blocked from re-registration.',
    'blacklist_warning'    => 'This action will prevent future registration with the same CR number.',

    // Modal labels / notes
    'reason_required'             => 'Reason (required)',
    'notes_required'              => 'Notes (required)',
    'notes_optional'              => 'Notes (optional)',
    'approval_notes_placeholder'  => 'Approval notes (optional)',

    // Capabilities & regions card
    'capabilities_regions_title'  => 'Capabilities & Regions',
    'capabilities_regions_help'   => 'Capabilities, certifications, service zones, and capacity info.',
    'cert_number_placeholder'     => 'Cert #',
    'issued_at_placeholder'       => 'Issued',
    'expires_at_placeholder'      => 'Expires',
    'saving'                      => 'Saving…',
    'save_capabilities'           => 'Save Capabilities',

    // Modals
    'confirm_delete_title'  => 'Delete Supplier',
    'confirm_delete_body'   => 'Are you sure you want to delete :name? This action cannot be undone.',
    'confirm_approve_title' => 'Approve Supplier',
    'confirm_approve_body'  => 'Approve :name and grant them access to the supplier portal?',
    'confirm_reject_title'  => 'Reject Supplier',
    'confirm_reject_body'   => 'Reject the application from :name?',
    'confirm_suspend_title' => 'Suspend Supplier',
    'confirm_suspend_body'  => 'Suspend :name? They will lose portal access.',

    // Empty states
    'empty_title'          => 'No suppliers found',
    'empty_body'           => 'No suppliers match your current filters.',
    'empty_filtered_title' => 'No suppliers match your filters.',
    'clear_filters'        => 'Clear filters',
    'empty_action'         => 'Add your first supplier',

    // Feedback messages (flash)
    'created'              => 'Supplier created successfully.',
    'updated'              => 'Supplier updated successfully.',
    'deleted'              => 'Supplier deleted successfully.',
    'approved'             => 'Supplier approved.',
    'rejected'             => 'Supplier rejected.',

    // Pagination
    'showing'              => 'Showing :from–:to of :total suppliers',

    // CR check (API / JSON)
    'cr_check_failed'              => 'Check failed',
    'cr_check_available'           => 'CR number is available.',
    'cr_check_registered'          => 'This CR number is already registered.',
    'cr_check_registered_system'   => 'This CR number is already registered in the system.',
    'cr_blacklisted_registration'  => 'This CR number has been blacklisted and cannot be registered.',

    // KSA validation messages
    'vat_format_invalid'           => 'VAT number must be 15 digits, starting and ending with 3',
    'cr_format_invalid'            => 'Commercial registration number must be exactly 10 digits',

    // Admin expiry warning (non-blocking)
    'expiry_dates_in_past_note'    => 'Note: one or more expiry dates are in the past',

    // Approval workflow (flash)
    'flash_approval_approve_credentials'   => 'Supplier approved. Login credentials have been sent.',
    'flash_approval_reactivate_credentials'  => 'Supplier has been reactivated. Login credentials have been sent.',
    'flash_approval_reject'                => 'Supplier has been rejected.',
    'flash_approval_request_info'          => 'More information has been requested.',
    'flash_approval_suspend'               => 'Supplier has been suspended.',
    'flash_approval_blacklist'             => 'Supplier has been blacklisted.',
    'flash_reset_password_sent'            => 'Set-password email has been sent.',
    'flash_reset_password_no_account'      => 'Supplier has no login account.',
    'blacklisted_supplier_reinstate'       => 'Blacklisted supplier must be reinstated first.',
    'approval_transition_error'            => 'Cannot perform :action on a supplier with status :status.',

    // Contacts (admin)
    'contact_added'                => 'Contact added.',
    'contact_updated'              => 'Contact updated.',
    'contact_deleted'              => 'Contact deleted.',
    'primary_contact_updated'      => 'Primary contact updated.',
    'confirm_delete_contact_title' => 'Delete contact',
    'confirm_delete_contact_body'  => 'Delete this contact? This cannot be undone.',

    // Supplier 360 toasts
    'capability_updated_toast'     => 'Capability updated.',
    'certification_updated_toast'    => 'Certification updated.',

    // KSA supplier document types (aligned with SupplierDocument model; mirrors lang/en/documents.php)
    'doc_type_commercial_registration' => 'Commercial Registration',
    'doc_type_unified_number'          => 'Unified Number',
    'doc_type_vat_certificate'         => 'VAT Certificate',
    'doc_type_business_license'        => 'Business License',
    'doc_type_national_address'        => 'National Address',
    'doc_type_bank_letter'             => 'Bank Letter',
    'doc_type_company_profile'         => 'Company Profile',
    'doc_type_iso_certificate'         => 'ISO Certificate',
    'doc_type_credit_application'      => 'Credit Application',
    'doc_type_other'                   => 'Other',

    // Supplier Intelligence index (filters + compliance labels)
    'intelligence_filter_all'           => 'All',
    'intelligence_filter_high_risk'     => 'High Risk',
    'intelligence_filter_non_compliant' => 'Non Compliant',
    'intelligence_filter_over_capacity' => 'Over Capacity',
    'intelligence_filter_suspended'     => 'Suspended',
    'intelligence_filter_blacklisted'   => 'Blacklisted',
    'intelligence_compliance_compliant'   => 'Compliant',
    'intelligence_compliance_expiring_soon' => 'Expiring soon',
    'intelligence_compliance_non_compliant' => 'Non-compliant',

    // Middleware / generic
    'supplier_access_only'         => 'Supplier access only.',
    'supplier_profile_not_found'   => 'Supplier profile not found.',
];

