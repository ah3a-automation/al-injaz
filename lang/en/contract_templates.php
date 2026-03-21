<?php

declare(strict_types=1);

return [
    'index' => [
        'title' => 'Contract templates',
        'heading' => 'Contract templates',
        'empty' => 'No contract templates found yet.',
        'actions' => [
            'new_template' => 'New template',
            'view' => 'View',
            'edit' => 'Edit',
        ],
    ],

    'create' => [
        'title' => 'New contract template',
        'heading' => 'New contract template',
        'subtitle' => 'Assemble a reusable template from master contract articles.',
        'actions' => [
            'save' => 'Create template',
        ],
        'sections' => [
            'metadata_title' => 'Template metadata',
            'metadata_description' => 'Define a stable code, bilingual name, type and lifecycle status.',
            'article_library_title' => 'Article library',
            'article_library_description' => 'Select which master contract articles belong to this template. Each article shows its code, English and Arabic titles, and a short English snippet. Full legal bodies are not expanded here.',
            'sequence_title' => 'Article sequence',
            'sequence_description' => 'Fine-tune the ordering of selected articles. This sequence will be used when drafting real contracts.',
        ],
        'empty_articles' => 'No active contract articles are available yet. Create articles first, then build templates.',
        'article_selected_badge' => 'Selected',
        'article_select_badge' => 'Click to add',
        'sequence_empty' => 'No articles selected yet. Choose articles from the library on the left.',
        'sequence_item_hint' => 'This article will appear in the contract using its current master content.',
    ],

    'edit' => [
        'title' => 'Edit template :code',
        'heading' => 'Edit contract template',
        'subtitle' => 'Adjust template metadata and article sequence. Changes do not alter historical contracts.',
        'actions' => [
            'save' => 'Save changes',
        ],
        'sections' => [
            'metadata_title' => 'Template metadata',
            'metadata_description' => 'Update bilingual names, type, status and notes. The code is immutable after creation.',
            'article_library_title' => 'Article library',
            'article_library_description' => 'Select which master articles belong to this template. Toggle to include or exclude from the current sequence.',
            'sequence_title' => 'Article sequence',
            'sequence_description' => 'Reorder selected articles to match the desired contract flow.',
        ],
        'empty_articles' => 'No active contract articles are available yet.',
        'article_selected_badge' => 'Included',
        'article_select_badge' => 'Click to include',
        'sequence_empty' => 'No articles are currently assigned to this template.',
        'sequence_item_hint' => 'This article will appear in the contract using its current master content.',
    ],

    'show' => [
        'title' => 'Template :code',
        'breadcrumbs' => [
            'contract_templates' => 'Contract templates',
        ],
        'actions' => [
            'edit' => 'Edit',
            'archive' => 'Archive',
            'reactivate' => 'Reactivate',
        ],
        'sections' => [
            'metadata_title' => 'Template metadata',
            'structure_title' => 'Template structure preview',
            'structure_description' => 'Each item shows the article code, English title, Arabic title and a short English snippet. Full legal bodies are intentionally not expanded on this page.',
        ],
        'structure_empty' => 'This template does not contain any articles yet.',
        'language_labels' => [
            'arabic' => 'Arabic title',
            'english_snippet' => 'English content snippet',
        ],
    ],

    'filters' => [
        'search_label' => 'Search',
        'search_placeholder' => 'Search by code or name…',
        'template_type_label' => 'Template type',
        'status_label' => 'Status',
        'approval_status_label' => 'Approval',
        'per_page_label' => 'Per page',
        'any_type' => 'Any type',
        'any_status' => 'Any status',
        'any_approval' => 'Any approval',
        'apply' => 'Apply',
    ],

    'columns' => [
        'code' => 'Code',
        'name' => 'Name',
        'template_type' => 'Template type',
        'status' => 'Status',
        'approval' => 'Approval',
        'updated_at' => 'Updated at',
        'actions' => 'Actions',
    ],

    'template_type' => [
        'supply' => 'Supply only',
        'supply_install' => 'Supply & install',
        'subcontract' => 'Subcontract works',
        'service' => 'Services',
        'consultancy' => 'Consultancy',
    ],

    'status' => [
        'draft' => 'Draft',
        'active' => 'Active',
        'archived' => 'Archived',
    ],

    'fields' => [
        'code' => [
            'label' => 'Code',
            'readonly_hint' => 'Code is a stable identifier and cannot be changed after creation.',
        ],
        'name_en' => [
            'label' => 'English name',
        ],
        'name_ar' => [
            'label' => 'Arabic name',
        ],
        'template_type' => [
            'label' => 'Template type',
        ],
        'status' => [
            'label' => 'Status',
        ],
        'description' => [
            'label' => 'Description',
        ],
        'internal_notes' => [
            'label' => 'Internal notes',
        ],
    ],

    'common' => [
        'cancel' => 'Cancel',
        'back_to_index' => 'Back to templates',
    ],

    'approval_status' => [
        'none' => 'None',
        'submitted' => 'Submitted',
        'contracts_approved' => 'Contracts approved',
        'legal_approved' => 'Legally approved',
        'rejected' => 'Rejected',
    ],

    'flash_submitted_for_approval' => 'Template submitted for approval.',
    'flash_contracts_approved' => 'Contracts manager approval recorded.',
    'flash_legal_approved' => 'Legal approval recorded. Template version saved and template is active.',
    'flash_rejected' => 'Template rejected.',
    'flash_restored_from_version' => 'Template restored from selected version. A new snapshot version was created.',
    'flash_cannot_edit_while_pending' => 'This template is pending approval. Only a super admin can change it until the workflow completes.',

    'governance' => [
        'submit' => 'Submit for approval',
        'approve_contracts' => 'Approve (contracts)',
        'approve_legal' => 'Approve (legal)',
        'reject' => 'Reject',
        'reject_reason' => 'Rejection reason',
        'version_history' => 'Template version history',
        'restore' => 'Restore this snapshot',
    ],
];

