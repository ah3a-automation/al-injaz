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

    // Filters
    'filter_category' => 'Filter by category',
    'filter_status'   => 'Filter by status',
    'all_categories'  => 'All categories',
    'all_statuses'    => 'All statuses',

    // Empty state
    'empty_title' => 'No contract articles found',
];

