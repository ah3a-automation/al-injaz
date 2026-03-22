<?php

declare(strict_types=1);

return [
    // Page titles
    'title_index'   => 'Contract Articles',
    'title_create'  => 'Create Contract Article',
    'title_edit'    => 'Edit Contract Article',
    'title_show'    => 'Contract Article Details',
    'title_compare' => 'Compare Versions',

    // Fields
    'article_code'      => 'Article Code',
    'serial'            => 'Serial',
    'category'          => 'Category',
    'status'            => 'Status',
    'internal_notes'    => 'Internal Notes',
    'version_history'   => 'Version History',
    'version_number'    => 'Version Number',
    'current_version'   => 'Current Version',
    'changed_by'        => 'Changed By',
    'changed_at'        => 'Changed At',
    'change_summary'    => 'Change Summary',
    'compare_versions'  => 'Compare Versions',
    'restore_version'   => 'Restore Version',
    'restored_from'     => 'Restored from version :version',
    'create_new_version'=> 'Create New Version',
    'no_versions'       => 'No versions found.',

    // Bilingual content
    'title_ar'      => 'Arabic Title',
    'title_en'      => 'English Title',
    'content_ar'    => 'Arabic Content',
    'content_en'    => 'English Content',
    'col_title_bilingual' => 'Title (EN / AR)',
    'col_updated_at'      => 'Updated At',
    'col_flags'           => 'Flags',
    'col_actions'         => 'Actions',

    // Categories
    'category_mandatory'   => 'Mandatory',
    'category_recommended' => 'Recommended',
    'category_optional'    => 'Optional',

    // Statuses
    'status_draft'    => 'Draft',
    'status_active'   => 'Active',
    'status_archived' => 'Archived',

    // Actions
    'action_view'     => 'View',
    'action_create'   => 'Create Article',
    'action_edit'     => 'Edit',
    'action_delete'   => 'Delete',
    'action_back'     => 'Back',
    'action_save'     => 'Save',
    'action_cancel'   => 'Cancel',
    'action_compare'  => 'Compare',
    'action_restore'  => 'Restore',
    'action_archive'  => 'Archive',
    'action_reactivate' => 'Reactivate',

    // Sections / headings
    'section_metadata'                => 'Article metadata',
    'section_metadata_create_help'    => 'Define code, ordering, category, status, and internal notes.',
    'section_metadata_edit_help'      => 'Update ordering, category, status, and internal notes.',
    'section_current_content'         => 'Current content',
    'section_current_content_help'    => 'Bilingual content for the latest version of this master article.',
    'section_version_history_help'    => 'View previous versions and open compare or restore actions.',
    'section_english_content'         => 'English content',
    'section_arabic_content'          => 'Arabic content',
    'section_english_content_create_help' => 'Title and body as used in English contracts.',
    'section_arabic_content_create_help'  => 'Title and body as used in Arabic contracts.',
    'section_english_content_edit_help'   => 'Update English title and content. Leaving fields unchanged will keep the current values.',
    'section_arabic_content_edit_help'    => 'Update Arabic title and content. Leave blank to keep current values.',
    'section_language'                => 'Language',
    'section_language_help'           => 'Switch between English and Arabic views for side-by-side comparison.',
    'section_compare_state'           => 'Compare availability',
    'section_version_selection'       => 'Version selection',
    'section_version_selection_help'  => 'Choose any two versions to compare. The compare view above will update based on the selection.',

    // Flags / labels
    'flag_current' => 'Current',
    'flag_left'    => 'Left',
    'flag_right'   => 'Right',
    'label_left_version'  => 'Left version',
    'label_right_version' => 'Right version',

    // Hints
    'hint_code_readonly' => 'Code is fixed for existing articles and cannot be changed.',

    // Info / messages
    'info_no_versions_for_article' => 'No versions found for this article yet.',
    'info_compare_single_version'  => 'Only one version exists for this article. Create a new version by editing the article to enable comparison.',
    'info_no_left_selected'        => 'No left version selected.',
    'info_no_right_selected'       => 'No right version selected.',
    'info_no_versions_selection'   => 'No versions available for selection.',

    // Clause risk tags (contract_article_versions.risk_tags)
    'risk_tags' => 'Clause risk tags',
    'risk_tags_help' => 'Tag this version for filtering and governance (optional).',
    'filter_risk_tags' => 'Filter by risk tags',
    'risk_tag_payment' => 'Payment',
    'risk_tag_delay_damages' => 'Delay damages',
    'risk_tag_retention' => 'Retention',
    'risk_tag_warranty' => 'Warranty',
    'risk_tag_termination' => 'Termination',
    'risk_tag_indemnity' => 'Indemnity',
    'risk_tag_insurance' => 'Insurance',
    'risk_tag_variation' => 'Variation',
    'risk_tag_dispute_resolution' => 'Dispute resolution',
    'risk_tag_liability' => 'Liability',
    'risk_tag_confidentiality' => 'Confidentiality',
    'risk_tag_force_majeure' => 'Force majeure',

    // Filters
    'filter_category' => 'Filter by category',
    'filter_status'   => 'Filter by status',
    'filter_approval' => 'Filter by approval',
    'all_categories'  => 'All categories',
    'all_statuses'    => 'All statuses',
    'all_approval'    => 'All approval states',

    // Approval workflow
    'approval_status'       => 'Approval',
    'approval_none'         => 'None',
    'approval_submitted'    => 'Submitted',
    'approval_contracts_ok' => 'Contracts approved',
    'approval_legal_ok'     => 'Legally approved',
    'approval_rejected'     => 'Rejected',
    'action_submit'         => 'Submit for approval',
    'action_approve_contracts' => 'Approve (contracts)',
    'action_approve_legal' => 'Approve (legal)',
    'action_reject'         => 'Reject',
    'reject_reason_label'   => 'Rejection reason',
    'reject_dialog_title'   => 'Reject article',

    // Flash
    'flash_submitted_for_approval' => 'Article submitted for approval.',
    'flash_contracts_approved'     => 'Contracts manager approval recorded.',
    'flash_legal_approved'         => 'Legal approval recorded. Article is active.',
    'flash_rejected'               => 'Article rejected.',
    'flash_cannot_edit_while_pending' => 'This article is pending approval. Only a super admin can change it until the workflow completes.',

    // Empty state
    'empty_title' => 'No contract articles found',

    // Block authoring (Create / Edit)
    'blocks_section_title'         => 'Article blocks',
    'blocks_section_help'          => 'Build the article as ordered blocks. Each block has a type, optional titles, and bilingual body text.',
    'blocks_empty'                 => 'No blocks yet. Add a block to begin.',
    'blocks_order_label'           => 'Block :n',
    'blocks_internal_badge'        => 'Internal',
    'blocks_move_up'               => 'Move block up',
    'blocks_move_down'             => 'Move block down',
    'blocks_duplicate'             => 'Duplicate block',
    'blocks_remove'                => 'Remove block',
    'blocks_type'                  => 'Block type',
    'blocks_is_internal'           => 'Internal (not shown in public/export preview)',
    'blocks_title_en'              => 'Block title (English)',
    'blocks_title_ar'              => 'Block title (Arabic)',
    'blocks_body_en'               => 'Body (English)',
    'blocks_body_ar'               => 'Body (Arabic)',
    'blocks_body_format_hint'      => 'Use toolbar for bold, lists, headings, or type Markdown-style (**bold**, ## heading, - list).',
    'blocks_options_title'         => 'Options (minimum 2)',
    'blocks_add_option'            => 'Add option',
    'blocks_option_key'            => 'Option :key',
    'blocks_remove_option'         => 'Remove option',
    'blocks_option_title_en'       => 'Option title (English)',
    'blocks_option_title_ar'       => 'Option title (Arabic)',
    'blocks_option_body_en'        => 'Option body (English)',
    'blocks_option_body_ar'        => 'Option body (Arabic)',
    'blocks_variable_keys'         => 'Variable keys',
    'blocks_variable_keys_help'    => 'Select contract variables referenced in this block (optional).',
    'blocks_risk_tags'             => 'Block risk tags',
    'blocks_add_block'             => 'Add block',
    'blocks_formatting_tools'      => 'Text formatting',
    'blocks_fmt_bold'              => 'Bold',
    'blocks_fmt_heading'           => 'Heading',
    'blocks_fmt_bullet'            => 'Bullet list',
    'blocks_fmt_numbered'          => 'Numbered list',
    'blocks_fmt_quote'             => 'Quote',

    'block_type_header'    => 'Header',
    'block_type_recital'   => 'Recital',
    'block_type_definition'=> 'Definition',
    'block_type_clause'    => 'Clause',
    'block_type_condition' => 'Condition',
    'block_type_option'    => 'Option',
    'block_type_note'      => 'Note',

    // Version titles (with blocks)
    'section_version_titles'          => 'Version titles',
    'section_version_titles_help'     => 'Titles for this version (shown in documents). Block bodies are edited below.',
    'section_version_titles_edit_help'=> 'Update version titles. Block content is edited in the blocks section.',
    'show_version_titles_note'        => 'Version-level titles apply to the whole article version; content is composed from blocks below.',
    'show_blocks_heading'             => 'Article content (blocks)',
    'show_internal_blocks_heading'    => 'Internal blocks',
    'block_untitled'                  => 'Untitled block',

    // Compare (blocks-aware)
    'compare_lang_en'       => 'English',
    'compare_lang_ar'       => 'Arabic',
    'compare_block_count'   => '{0} No blocks|{1} :count block|[2,*] :count blocks',
    'compare_col_blocks'    => 'Blocks',
    'compare_set_left'      => 'Compare as left',
    'compare_set_right'     => 'Compare as right',
];

