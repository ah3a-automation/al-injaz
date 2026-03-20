<?php

declare(strict_types=1);

return [
    // Page titles
    'title_index'       => 'المهام',
    'title_create'      => 'إنشاء مهمة',
    'title_edit'        => 'تعديل المهمة',
    'title_detail'      => 'تفاصيل المهمة',

    // Table columns
    'col_title'         => 'العنوان',
    'col_status'        => 'الحالة',
    'col_priority'      => 'الأولوية',
    'col_assignee'      => 'المسؤول',
    'col_due_date'      => 'تاريخ الاستحقاق',
    'col_project'       => 'المشروع',
    'col_created'       => 'تاريخ الإنشاء',
    'col_actions'       => 'الإجراءات',

    // Filters
    'filter_status'     => 'تصفية حسب الحالة',
    'filter_priority'   => 'تصفية حسب الأولوية',
    'filter_assignee'   => 'تصفية حسب المسؤول',
    'all_statuses'      => 'جميع الحالات',
    'all_priorities'    => 'جميع الأولويات',
    'all_assignees'     => 'جميع المسؤولين',
    'search_placeholder'=> 'البحث في المهام...',

    // Status badges
    'status_open'           => 'مفتوحة',
    'status_in_progress'    => 'قيد التنفيذ',
    'status_completed'      => 'مكتملة',
    'status_cancelled'      => 'مُلغاة',
    'status_on_hold'        => 'معلقة',
    'status_overdue'        => 'متأخرة',

    // Priority badges
    'priority_low'      => 'منخفضة',
    'priority_medium'   => 'متوسطة',
    'priority_high'     => 'عالية',
    'priority_critical' => 'حرجة',
    'priority_urgent'   => 'عاجلة',
    'priority_normal'   => 'عادية',

    // Actions
    'action_create'     => 'إنشاء مهمة',
    'action_edit'       => 'تعديل',
    'action_delete'     => 'حذف',
    'action_complete'   => 'تحديد كمكتملة',
    'action_reopen'     => 'إعادة فتح',
    'action_save'       => 'حفظ',
    'action_cancel'     => 'إلغاء',
    'action_back'       => 'رجوع',
    'action_assign'     => 'تعيين',
    'action_comment'    => 'إضافة تعليق',

    // Form fields
    'field_title'       => 'عنوان المهمة',
    'field_description' => 'الوصف',
    'field_status'      => 'الحالة',
    'field_priority'    => 'الأولوية',
    'field_assignee'    => 'تعيين إلى',
    'field_due_date'    => 'تاريخ الاستحقاق',
    'field_project'     => 'المشروع المرتبط',
    'field_rfq'         => 'طلب عرض السعر المرتبط',
    'field_notes'       => 'ملاحظات',
    'field_attachments' => 'المرفقات',

    // Section headings
    'section_details'   => 'تفاصيل المهمة',
    'section_assignment'=> 'التعيين',
    'section_comments'  => 'التعليقات',
    'section_activity'  => 'النشاط',
    'section_related'   => 'العناصر المرتبطة',

    // Comments
    'comment_placeholder' => 'اكتب تعليقاً...',
    'comment_post'        => 'نشر التعليق',
    'no_comments'         => 'لا توجد تعليقات بعد',
    'comment_by'          => 'تعليق من :name',
    'comment_at'          => ':date',

    // Modals
    'confirm_delete_title'  => 'حذف المهمة',
    'confirm_delete_body'   => 'حذف المهمة ":title"؟ لا يمكن التراجع عن هذا الإجراء.',
    'confirm_complete_title'=> 'إتمام المهمة',
    'confirm_complete_body' => 'تحديد ":title" كمكتملة؟',

    // Empty states
    'empty_title'       => 'لا توجد مهام',
    'empty_body'        => 'لا توجد مهام تطابق عوامل التصفية الحالية.',
    'empty_action'      => 'أنشئ أول مهمة',

    // Feedback
    'created'           => 'تم إنشاء المهمة بنجاح.',
    'updated'           => 'تم تحديث المهمة بنجاح.',
    'deleted'           => 'تم حذف المهمة بنجاح.',
    'completed'         => 'تم تحديد المهمة كمكتملة.',
    'reopened'          => 'تمت إعادة فتح المهمة.',
    'comment_added'     => 'تمت إضافة التعليق.',

    // Due date helpers
    'due_today'         => 'مستحقة اليوم',
    'due_tomorrow'      => 'مستحقة غداً',
    'overdue_by'        => '{1} متأخرة يوم واحد|[2,*] متأخرة :days أيام',
    'due_in'            => '{1} مستحقة خلال يوم واحد|[2,*] مستحقة خلال :days يوم',

    // Pagination
    'showing'           => 'عرض :from–:to من أصل :total مهمة',
];

