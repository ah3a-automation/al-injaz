<?php

declare(strict_types=1);

return [
    // Page titles
    'title_index'   => 'مواد العقود',
    'title_create'  => 'إنشاء مادة عقد',
    'title_edit'    => 'تعديل مادة العقد',
    'title_show'    => 'تفاصيل مادة العقد',
    'title_compare' => 'مقارنة الإصدارات',

    // Fields
    'article_code'      => 'رمز المادة',
    'serial'            => 'الترتيب',
    'category'          => 'الفئة',
    'status'            => 'الحالة',
    'internal_notes'    => 'ملاحظات داخلية',
    'version_history'   => 'سجل الإصدارات',
    'version_number'    => 'رقم الإصدار',
    'current_version'   => 'الإصدار الحالي',
    'changed_by'        => 'تم التعديل بواسطة',
    'changed_at'        => 'تاريخ التعديل',
    'change_summary'    => 'ملخص التغيير',
    'compare_versions'  => 'مقارنة الإصدارات',
    'restore_version'   => 'استعادة الإصدار',
    'restored_from'     => 'تمت الاستعادة من الإصدار :version',
    'create_new_version'=> 'إنشاء إصدار جديد',
    'no_versions'       => 'لا توجد إصدارات.',

    // Bilingual content
    'title_ar'      => 'العنوان بالعربية',
    'title_en'      => 'العنوان بالإنجليزية',
    'content_ar'    => 'النص بالعربية',
    'content_en'    => 'النص بالإنجليزية',
    'col_title_bilingual' => 'العنوان (عربي / إنجليزي)',
    'col_updated_at'      => 'تاريخ التحديث',
    'col_flags'           => 'الوسوم',
    'col_actions'         => 'الإجراءات',

    // Categories
    'category_mandatory'   => 'إلزامية',
    'category_recommended' => 'موصى بها',
    'category_optional'    => 'اختيارية',

    // Statuses
    'status_draft'    => 'مسودة',
    'status_active'   => 'نشطة',
    'status_archived' => 'مؤرشفة',

    // Actions
    'action_view'     => 'عرض',
    'action_create'   => 'إنشاء مادة',
    'action_edit'     => 'تعديل',
    'action_delete'   => 'حذف',
    'action_back'     => 'رجوع',
    'action_save'     => 'حفظ',
    'action_cancel'   => 'إلغاء',
    'action_compare'  => 'مقارنة',
    'action_restore'  => 'استعادة',
    'action_archive'  => 'أرشفة',
    'action_reactivate' => 'إعادة تفعيل',

    // Sections / headings
    'section_metadata'                => 'بيانات المادة',
    'section_metadata_create_help'    => 'تحديد الرمز والترتيب والفئة والحالة والملاحظات الداخلية.',
    'section_metadata_edit_help'      => 'تحديث الترتيب والفئة والحالة والملاحظات الداخلية.',
    'section_current_content'         => 'المحتوى الحالي',
    'section_current_content_help'    => 'المحتوى الثنائي اللغة لأحدث إصدار من مادة العقد.',
    'section_version_history_help'    => 'عرض الإصدارات السابقة وفتح إجراءات المقارنة أو الاستعادة.',
    'section_english_content'         => 'المحتوى بالإنجليزية',
    'section_arabic_content'          => 'المحتوى بالعربية',
    'section_english_content_create_help' => 'العنوان والنص كما يستخدمان في العقود باللغة الإنجليزية.',
    'section_arabic_content_create_help'  => 'العنوان والنص كما يستخدمان في العقود باللغة العربية.',
    'section_english_content_edit_help'   => 'تحديث العنوان والمحتوى باللغة الإنجليزية. ترك الحقول دون تغيير يحافظ على القيم الحالية.',
    'section_arabic_content_edit_help'    => 'تحديث العنوان والمحتوى باللغة العربية. ترك الحقول فارغة يحافظ على القيم الحالية.',
    'section_language'                => 'اللغة',
    'section_language_help'           => 'التبديل بين الإنجليزية والعربية للمقارنة جنباً إلى جنب.',
    'section_compare_state'           => 'حالة المقارنة',
    'section_version_selection'       => 'اختيار الإصدارات',
    'section_version_selection_help'  => 'اختر أي إصدارين للمقارنة. سيتم تحديث عرض المقارنة أعلاه بناءً على الاختيار.',

    // Flags / labels
    'flag_current' => 'الحالي',
    'flag_left'    => 'يسار',
    'flag_right'   => 'يمين',
    'label_left_version'  => 'الإصدار الأيسر',
    'label_right_version' => 'الإصدار الأيمن',

    // Hints
    'hint_code_readonly' => 'رمز المادة ثابت للمواد القائمة ولا يمكن تعديله.',

    // Info / messages
    'info_no_versions_for_article' => 'لا توجد إصدارات لهذه المادة حتى الآن.',
    'info_compare_single_version'  => 'يوجد إصدار واحد فقط لهذه المادة. أنشئ إصداراً جديداً من خلال تعديل المادة لتفعيل المقارنة.',
    'info_no_left_selected'        => 'لم يتم اختيار إصدار في الجانب الأيسر.',
    'info_no_right_selected'       => 'لم يتم اختيار إصدار في الجانب الأيمن.',
    'info_no_versions_selection'   => 'لا توجد إصدارات متاحة للاختيار.',

    // Filters
    'filter_category' => 'تصفية حسب الفئة',
    'filter_status'   => 'تصفية حسب الحالة',
    'all_categories'  => 'جميع الفئات',
    'all_statuses'    => 'جميع الحالات',

    // Empty state
    'empty_title' => 'لا توجد مواد عقود',
];

