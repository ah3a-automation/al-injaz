<?php

declare(strict_types=1);

return [
    'title'                => 'لوحة ذكاء المشتريات',
    'welcome'              => 'مرحباً، :name. نظرة عامة على مؤشرات المشتريات والنشاط.',

    // KPI cards (top row — server KPIs)
    'active_projects'                => 'المشاريع النشطة',
    'packages_in_progress'           => 'الحزم قيد التنفيذ',
    'rfqs_issued'                    => 'طلبات العروض المُصدرة',
    'rfqs_issued_help'               => 'طلبات العروض بحالة «صادرة» حالياً (مفعّلة للموردين).',
    'pending_clarifications'         => 'التوضيحات المعلقة',
    'supplier_registrations_pending' => 'طلبات تسجيل الموردين المعلقة',
    'overdue_deadlines'              => 'مواعيد الإقفال المتأخرة',

    // Stat tiles (JSON metrics)
    'active_contracts'     => 'العقود النشطة',
    'quotes_received'      => 'العروض المستلمة',
    'suppliers_registered' => 'الموردون المسجلون',
    'rfqs_in_progress'     => 'طلبات العروض قيد المعالجة',
    'rfqs_in_progress_help' => 'طلبات العروض التي لم تُرسَ أو تُغلق بعد (من المسودة حتى المُوصى به). قارن مع «طلبات العروض المُصدرة» أعلاه التي تعدّل الطلبات الصادرة فقط.',
    'suppliers_registered_help' => 'الموردون المعتمدون في الدليل.',
    'quotes_received_help' => 'عدد الاستجابات المميزة (مورد × طلب عروض) بحالة مقدّمة أو معدّلة.',
    'active_contracts_help' => 'العقود بحالة نشطة أو مكتملة أو في انتظار التوقيع.',

    // Procurement insights (computed)
    'procurement_insights_title' => 'رؤى المشتريات',
    'insights_all_on_track'    => 'جميع أنشطة المشتريات ضمن المسار المطلوب.',
    'insight_rfqs_stale_no_quotes' => ':count طلب عروض مفتوح لأكثر من 14 يوماً دون عروض مقدّمة أو معدّلة.',
    'insight_supplier_docs_expiring' => ':count مورد(ين) لديهم وثيقة واحدة على الأقل تنتهي خلال الـ 30 يوماً القادمة.',
    'insight_contracts_awaiting_approval' => ':count عقد(ات) في مراجعة داخلية بانتظار الموافقة.',
    'insight_overdue_tasks' => ':count مهمة(ات) متأخرة وغير مكتملة.',

    // RFQ Pipeline
    'rfq_pipeline'         => 'مسار طلبات عروض الأسعار',
    'total_rfqs'           => 'الإجمالي: :count طلب',
    'status_draft'         => 'مسودة',
    'status_sent'          => 'أُرسل للموردين',
    'status_quotes'        => 'العروض المستلمة',
    'status_evaluation'    => 'التقييم',
    'status_awarded'       => 'مُرسى',

    // Supplier Ranking
    'supplier_ranking'     => 'تصنيف الموردين',
    'col_supplier'         => 'المورد',
    'col_score'            => 'النتيجة',
    'col_projects'         => 'المشاريع',

    // Coverage Map
    'coverage_map'         => 'خريطة تغطية الموردين',
    'map_preview'          => 'معاينة الخريطة',

    // Supplier Intelligence
    'supplier_intelligence_title' => 'ذكاء الموردين',
    'avg_supplier_score'          => 'متوسط تقييم الموردين',

    // Empty states & misc
    'no_activity'          => 'لا يوجد نشاط حديث',
    'no_suppliers'         => 'لا يوجد موردون',
    'no_data'              => 'لا توجد بيانات',
    'view_all'             => 'عرض الكل',
    'loading'              => 'جارٍ التحميل...',

    'recent_activity' => 'النشاط الأخير',
];
