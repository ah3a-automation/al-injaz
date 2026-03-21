<?php

declare(strict_types=1);

return [
    'index' => [
        'title' => 'قوالب العقود',
        'heading' => 'قوالب العقود',
        'empty' => 'لا توجد قوالب عقود حتى الآن.',
        'actions' => [
            'new_template' => 'قالب جديد',
            'view' => 'عرض',
            'edit' => 'تعديل',
        ],
    ],

    'create' => [
        'title' => 'قالب عقد جديد',
        'heading' => 'قالب عقد جديد',
        'subtitle' => 'تركيب قالب قابل لإعادة الاستخدام من مواد العقود الرئيسية.',
        'actions' => [
            'save' => 'إنشاء القالب',
        ],
        'sections' => [
            'metadata_title' => 'بيانات القالب',
            'metadata_description' => 'تحديد كود ثابت، واسم باللغتين، ونوع القالب وحالة دورة الحياة.',
            'article_library_title' => 'مكتبة المواد',
            'article_library_description' => 'اختر مواد العقود الرئيسية التي تنتمي لهذا القالب. يظهر لكل مادة الكود والعنوان بالإنجليزية والعربية، ومقتطف قصير باللغة الإنجليزية. لا يتم عرض النصوص القانونية الكاملة هنا.',
            'sequence_title' => 'تسلسل المواد',
            'sequence_description' => 'اضبط ترتيب المواد المختارة. سيتم استخدام هذا التسلسل عند إعداد العقود الفعلية.',
        ],
        'empty_articles' => 'لا توجد مواد عقود فعالة حتى الآن. يرجى إنشاء المواد أولاً ثم بناء القوالب.',
        'article_selected_badge' => 'محدد',
        'article_select_badge' => 'انقر للإضافة',
        'sequence_empty' => 'لم يتم اختيار أي مواد حتى الآن. اختر المواد من المكتبة على اليسار.',
        'sequence_item_hint' => 'ستظهر هذه المادة في العقد باستخدام محتواها الحالي من مكتبة المواد.',
    ],

    'edit' => [
        'title' => 'تعديل القالب :code',
        'heading' => 'تعديل قالب العقد',
        'subtitle' => 'تعديل بيانات القالب وتسلسل المواد. لا تؤثر التغييرات على العقود التاريخية.',
        'actions' => [
            'save' => 'حفظ التغييرات',
        ],
        'sections' => [
            'metadata_title' => 'بيانات القالب',
            'metadata_description' => 'تحديث الأسماء باللغتين، والنوع، والحالة، والملاحظات. الكود ثابت بعد الإنشاء.',
            'article_library_title' => 'مكتبة المواد',
            'article_library_description' => 'اختر المواد الرئيسية التي تنتمي لهذا القالب. استخدم التبديل للإضافة أو الإزالة من التسلسل الحالي.',
            'sequence_title' => 'تسلسل المواد',
            'sequence_description' => 'أعد ترتيب المواد المختارة لتوافق تسلسل العقد المطلوب.',
        ],
        'empty_articles' => 'لا توجد مواد عقود فعالة حالياً.',
        'article_selected_badge' => 'مضاف',
        'article_select_badge' => 'انقر للإضافة',
        'sequence_empty' => 'لا توجد مواد مرتبطة بهذا القالب حالياً.',
        'sequence_item_hint' => 'ستظهر هذه المادة في العقد باستخدام محتواها الحالي من مكتبة المواد.',
    ],

    'show' => [
        'title' => 'القالب :code',
        'breadcrumbs' => [
            'contract_templates' => 'قوالب العقود',
        ],
        'actions' => [
            'edit' => 'تعديل',
            'archive' => 'أرشفة',
            'reactivate' => 'إعادة تفعيل',
        ],
        'sections' => [
            'metadata_title' => 'بيانات القالب',
            'structure_title' => 'معاينة هيكل القالب',
            'structure_description' => 'يظهر لكل عنصر كود المادة، والعنوان بالإنجليزية، والعنوان بالعربية، ومقتطف قصير باللغة الإنجليزية. لا يتم توسيع النصوص القانونية الكاملة في هذه الصفحة عمداً.',
        ],
        'structure_empty' => 'لا يحتوي هذا القالب على أي مواد حتى الآن.',
        'language_labels' => [
            'arabic' => 'العنوان بالعربية',
            'english_snippet' => 'مقتطف من النص الإنجليزي',
        ],
    ],

    'filters' => [
        'search_label' => 'بحث',
        'search_placeholder' => 'بحث بالكود أو الاسم…',
        'template_type_label' => 'نوع القالب',
        'status_label' => 'الحالة',
        'approval_status_label' => 'الموافقة',
        'per_page_label' => 'لكل صفحة',
        'any_type' => 'أي نوع',
        'any_status' => 'أي حالة',
        'any_approval' => 'أي موافقة',
        'apply' => 'تطبيق',
    ],

    'columns' => [
        'code' => 'الكود',
        'name' => 'الاسم',
        'template_type' => 'نوع القالب',
        'status' => 'الحالة',
        'approval' => 'الموافقة',
        'updated_at' => 'تاريخ التحديث',
        'actions' => 'الإجراءات',
    ],

    'template_type' => [
        'supply' => 'توريد فقط',
        'supply_install' => 'توريد وتركيب',
        'subcontract' => 'مقاولة باطن',
        'service' => 'خدمات',
        'consultancy' => 'استشارات',
    ],

    'status' => [
        'draft' => 'مسودة',
        'active' => 'نشط',
        'archived' => 'مؤرشف',
    ],

    'fields' => [
        'code' => [
            'label' => 'الكود',
            'readonly_hint' => 'الكود معرف ثابت ولا يمكن تغييره بعد الإنشاء.',
        ],
        'name_en' => [
            'label' => 'الاسم بالإنجليزية',
        ],
        'name_ar' => [
            'label' => 'الاسم بالعربية',
        ],
        'template_type' => [
            'label' => 'نوع القالب',
        ],
        'status' => [
            'label' => 'الحالة',
        ],
        'description' => [
            'label' => 'الوصف',
        ],
        'internal_notes' => [
            'label' => 'ملاحظات داخلية',
        ],
    ],

    'common' => [
        'cancel' => 'إلغاء',
        'back_to_index' => 'الرجوع إلى القوالب',
    ],

    'approval_status' => [
        'none' => 'لا يوجد',
        'submitted' => 'مُقدَّم',
        'contracts_approved' => 'موافقة العقود',
        'legal_approved' => 'موافقة قانونية',
        'rejected' => 'مرفوض',
    ],

    'flash_submitted_for_approval' => 'تم إرسال القالب للموافقة.',
    'flash_contracts_approved' => 'تم تسجيل موافقة مدير العقود.',
    'flash_legal_approved' => 'تم تسجيل الموافقة القانونية وتم حفظ إصدار القالب.',
    'flash_rejected' => 'تم رفض القالب.',
    'flash_restored_from_version' => 'تم استعادة القالب من الإصدار المحدد وإنشاء لقطة جديدة.',
    'flash_cannot_edit_while_pending' => 'القالب قيد الموافقة. يمكن للمشرف الأعلى فقط تعديله حتى اكتمال الإجراء.',

    'governance' => [
        'submit' => 'إرسال للموافقة',
        'approve_contracts' => 'موافقة (العقود)',
        'approve_legal' => 'موافقة (القانونية)',
        'reject' => 'رفض',
        'reject_reason' => 'سبب الرفض',
        'version_history' => 'سجل إصدارات القالب',
        'restore' => 'استعادة هذه اللقطة',
    ],
];

