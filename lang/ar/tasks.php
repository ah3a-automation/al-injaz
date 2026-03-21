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

    // Status badges (canonical task statuses)
    'status_backlog'        => 'قائمة الانتظار',
    'status_open'           => 'مفتوحة',
    'status_in_progress'    => 'قيد التنفيذ',
    'status_review'         => 'مراجعة',
    'status_done'           => 'منجزة',
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

    // Feedback (flash)
    'flash_created'                 => 'تم إنشاء المهمة بنجاح.',
    'flash_updated'                 => 'تم تحديث المهمة بنجاح.',
    'flash_deleted'                 => 'تم حذف المهمة بنجاح.',
    'flash_update_failed'           => 'تعذّر تحديث المهمة.',
    'flash_link_added'              => 'تمت إضافة الارتباط.',
    'flash_link_removed'            => 'تمت إزالة الارتباط.',
    'flash_reminder_set'            => 'تم جدولة التذكير.',
    'flash_reminder_removed'        => 'تمت إزالة التذكير.',
    'flash_attachment_added'        => 'تمت إضافة المرفق.',
    'flash_attachment_removed'      => 'تمت إزالة المرفق.',
    'flash_comment_added'           => 'تمت إضافة التعليق.',
    'flash_comment_deleted'         => 'تم حذف التعليق.',
    'flash_comment_media_added'     => 'تمت إضافة مرفق للتعليق.',
    'flash_comment_media_removed'   => 'تمت إزالة مرفق التعليق.',
    'link_entity_not_found'         => 'تعذّر العثور على السجل المرتبط.',

    // Feedback (legacy keys — keep for existing UI)
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

    // Linked entity types (task_links)
    'link_type_project'          => 'مشروع',
    'link_type_supplier'         => 'مورّد',
    'link_type_rfq'              => 'طلب عرض أسعار',
    'link_type_package'          => 'حزمة توريد',
    'link_type_contract'         => 'عقد',
    'link_type_purchase_request' => 'طلب شراء',

    // Reminder / notification copy
    'reminder_due_label'    => 'الاستحقاق',
    'reminder_note_label'   => 'ملاحظة',

    // Activity log descriptions (tasks.* events)
    'activity_task_created'       => 'تم إنشاء المهمة',
    'activity_task_updated'       => 'تم تحديث المهمة',
    'activity_task_deleted'       => 'تم حذف المهمة',
    'activity_assignee_added'     => 'تمت إضافة مسؤول',
    'activity_assignee_removed'   => 'تمت إزالة مسؤول',
    'activity_comment_added'      => 'تمت إضافة تعليق',
    'activity_comment_deleted'    => 'تم حذف تعليق',
    'activity_link_added'         => 'تمت إضافة ارتباط مرتبط',
    'activity_link_removed'       => 'تمت إزالة ارتباط مرتبط',
    'activity_reminder_set'       => 'تم تعيين تذكير',
    'activity_attachment_added'   => 'تمت إضافة مرفق',
    'activity_attachment_removed' => 'تمت إزالة مرفق',
    'activity_status_changed'     => 'تغيّرت الحالة',
];

