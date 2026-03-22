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
    'active_contracts'     => 'Active Contracts',
    'quotes_received'      => 'Quotes Received',
    'suppliers_registered' => 'Suppliers Registered',
    'rfqs_in_progress'     => 'RFQs In Progress',
    'rfqs_in_progress_help' => 'RFQs not yet awarded or closed (draft through recommended). Compare with “RFQs Issued” above, which counts only issued RFQs.',
    'suppliers_registered_help' => 'Approved suppliers in the directory.',
    'quotes_received_help' => 'Distinct supplier responses per RFQ with status submitted or revised.',
    'active_contracts_help' => 'Contracts in active, completed, or pending signature states.',

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
