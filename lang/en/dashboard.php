<?php

declare(strict_types=1);

return [
    'title'                => 'Procurement Intelligence Dashboard',
    'welcome'              => 'Welcome, :name. Overview of procurement KPIs and activity.',

    // KPI cards (top row — server KPIs)
    'active_projects'                => 'Active Projects',
    'packages_in_progress'           => 'Packages in Progress',
    'rfqs_issued'                    => 'RFQs Issued',
    'rfqs_issued_help'               => 'RFQs currently in status “issued” (live to suppliers).',
    'pending_clarifications'         => 'Pending Clarifications',
    'supplier_registrations_pending' => 'Registrations Pending',
    'overdue_deadlines'              => 'Overdue Deadlines',

    // Stat tiles (JSON metrics)
    'contracts_active_only' => 'Active contracts',
    'quotes_received'      => 'Quotes Received',
    'suppliers_registered' => 'Suppliers Registered',
    'rfqs_in_progress'     => 'RFQs In Progress',
    'rfqs_in_progress_help' => 'RFQs not yet awarded or closed (draft through recommended). Compare with “RFQs Issued” above, which counts only issued RFQs.',
    'suppliers_registered_help' => 'Approved suppliers in the directory.',
    'quotes_received_help' => 'Distinct supplier responses per RFQ with status submitted or revised.',
    'contracts_active_only_help' => 'Contracts in status “active” only (executed commercial work).',

    // Tasks KPI block
    'tasks_kpi_title'      => 'Tasks',
    'tasks_org_section'    => 'Organization',
    'tasks_my_section'     => 'My tasks',
    'org_overdue_tasks'    => 'Overdue tasks (all)',
    'org_tasks_due_today'  => 'Due today (all)',
    'my_overdue_tasks'     => 'My overdue tasks',
    'my_tasks_due_today'   => 'My tasks due today',
    'open_tasks_total'     => 'Open tasks (total)',

    // Contracts status
    'contracts_status_title'       => 'Contracts status',
    'contracts_pending_review'     => 'Pending internal review',
    'contracts_awaiting_signature' => 'Awaiting signature',
    'contracts_active'             => 'Active',
    'contracts_pipeline_count'   => 'Contract pipeline (pre-execution)',
    'contracts_pipeline_help'    => 'Counts contracts in pending signature or internal review stages (see definition in docs).',

    // Contract value exposure
    'contract_value_title'           => 'Contract value exposure',
    'active_contracts_value_label'   => 'Active contracts (value)',
    'pipeline_contracts_value_label' => 'Pipeline (value)',
    'contract_value_help'            => 'Sum of contract_value by currency for the selected status groups.',

    // Execution risk (variations / claims / notices)
    'execution_risk_title' => 'Contract execution risk',
    'open_variations'      => 'Open variations (submitted)',
    'variation_exposure'   => 'Variation exposure (commercial delta)',
    'open_claims'          => 'Open claims',
    'open_notices'         => 'Open notices',

    // Governance risk
    'governance_risk_title'           => 'Governance & negotiation risk',
    'contracts_stuck_in_draft'        => 'Contracts in draft > 7 days',
    'contracts_in_review_over_7_days' => 'In internal review > 7 days',
    'articles_pending_approval'       => 'Library articles pending approval',
    'open_negotiations'               => 'Draft articles in active negotiation / deviation',
    'view_contract_articles'          => 'Contract articles',

    // Supplier approval funnel
    'supplier_approval_funnel_title' => 'Supplier approval funnel',
    'suppliers_pending_approval'     => 'Pending approval (queue)',
    'suppliers_approved_this_month'  => 'Approved (this month)',
    'suppliers_rejected_this_month'  => 'Rejected (this month)',
    'supplier_approval_rate'         => 'Approval rate (this month)',
    'supplier_approval_funnel_help'  => 'Rate = approved ÷ (approved + rejected) for decisions recorded this month.',
    'view_suppliers'                 => 'Suppliers',

    // Invoice pipeline
    'invoice_pipeline_title'           => 'Invoice pipeline',
    'invoices_pending_approval_label'  => 'Pending approval (submitted)',
    'invoices_approved_unpaid_label'    => 'Approved, unpaid',
    'invoices_total_outstanding_label' => 'Total outstanding (submitted + approved)',
    'view_contracts'                   => 'View contracts',

    // RFQ response rate (issued RFQs only)
    'rfq_response_rate_label' => 'Response rate (issued RFQs)',
    'rfq_response_rate_help'  => 'Share of currently issued RFQs with at least one submitted or revised supplier quote.',

    // Supplier intelligence — high risk
    'high_risk_suppliers_title' => 'High-risk suppliers (score below 50)',
    'risk_score_label'          => 'Score: :score',

    // Procurement insights (computed)
    'procurement_insights_title' => 'Procurement insights',
    'insights_all_on_track'    => 'All procurement activities are on track.',
    'insight_rfqs_stale_no_quotes' => ':count RFQ(s) open over 14 days with no submitted or revised quotes.',
    'insight_supplier_docs_expiring' => ':count supplier(s) have at least one document expiring in the next 30 days.',
    'insight_contracts_awaiting_approval' => ':count contract(s) in internal review awaiting approval.',
    'insight_overdue_tasks' => ':count overdue open task(s).',

    // RFQ Pipeline
    'rfq_pipeline'         => 'RFQ Pipeline',
    'total_rfqs'           => 'Total: :count RFQs',
    'status_draft'         => 'Draft',
    'status_sent'          => 'Sent to Suppliers',
    'status_quotes'        => 'Quotes Received',
    'status_evaluation'    => 'Evaluation',
    'status_awarded'       => 'Awarded',

    // Supplier Ranking
    'supplier_ranking'     => 'Supplier Ranking',
    'col_supplier'         => 'Supplier',
    'col_score'            => 'Score',
    'col_projects'         => 'Projects',

    // Coverage Map
    'coverage_map'         => 'Supplier Coverage Map',
    'map_preview'          => 'Map preview',

    // Supplier Intelligence
    'supplier_intelligence_title' => 'Supplier Intelligence',
    'avg_supplier_score'          => 'Average supplier score',

    // Empty states & misc
    'no_activity'          => 'No recent activity',
    'no_suppliers'         => 'No suppliers found',
    'no_data'              => 'No data available',
    'view_all'             => 'View all',
    'loading'              => 'Loading...',

    'recent_activity' => 'Recent Activity',
];
