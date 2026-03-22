import AppLayout from '@/Layouts/AppLayout';
import { AIInsightsCard } from '@/Components/dashboard/AIInsightsCard';
import { ContractsStatusCard } from '@/Components/dashboard/ContractsStatusCard';
import { DashboardStats } from '@/Components/dashboard/DashboardStats';
import { InvoicePipelineCard } from '@/Components/dashboard/InvoicePipelineCard';
import { RecentActivityCard } from '@/Components/dashboard/RecentActivityCard';
import { RFQPipelineCard } from '@/Components/dashboard/RFQPipelineCard';
import { SupplierCoverageCard } from '@/Components/dashboard/SupplierCoverageCard';
import { ContractExecutionRiskCard } from '@/Components/dashboard/ContractExecutionRiskCard';
import { ContractValueCard } from '@/Components/dashboard/ContractValueCard';
import { GovernanceRiskCard } from '@/Components/dashboard/GovernanceRiskCard';
import { SupplierIntelligenceCard } from '@/Components/dashboard/SupplierIntelligenceCard';
import { SupplierApprovalFunnelCard } from '@/Components/dashboard/SupplierApprovalFunnelCard';
import { SupplierRankingCard } from '@/Components/dashboard/SupplierRankingCard';
import { TasksKpiCard } from '@/Components/dashboard/TasksKpiCard';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import type { SharedPageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';
import type { ProcurementInsightsPayload } from '@/Components/dashboard/AIInsightsCard';
import type { TasksKpiPayload } from '@/Components/dashboard/TasksKpiCard';
import type { ContractsStatusPayload } from '@/Components/dashboard/ContractsStatusCard';
import type { ExecutionRiskPayload } from '@/Components/dashboard/ContractExecutionRiskCard';
import type { InvoicePipelinePayload } from '@/Components/dashboard/InvoicePipelineCard';
import type { GovernanceRiskPayload } from '@/Components/dashboard/GovernanceRiskCard';
import type { RecentActivityItem } from '@/Components/dashboard/RecentActivityCard';
import type { SupplierApprovalFunnelPayload } from '@/Components/dashboard/SupplierApprovalFunnelCard';
import type { CurrencyAmountRow } from '@/Components/dashboard/ContractValueCard';
import { KpiCard } from '@/Components/KpiCard';
import {
    AlertTriangle,
    FileText,
    FolderOpen,
    MessageCircle,
    Package as PackageIcon,
    UserCheck,
} from 'lucide-react';

export interface DashboardMetrics {
    rfqs_in_progress: number;
    suppliers_count: number;
    quotes_received: number;
    contracts_active_count: number;
    pipeline: {
        draft: number;
        sent: number;
        quotes_received: number;
        evaluation: number;
        awarded: number;
    };
    rfq_response_rate: number;
    tasks_kpis?: TasksKpiPayload | null;
    contracts_status?: ContractsStatusPayload | null;
    active_contracts_value?: CurrencyAmountRow[] | null;
    pipeline_contracts_value?: CurrencyAmountRow[] | null;
    execution_risk?: ExecutionRiskPayload | null;
    governance_risk?: GovernanceRiskPayload | null;
    supplier_approval_funnel?: SupplierApprovalFunnelPayload | null;
    invoice_pipeline?: InvoicePipelinePayload | null;
    supplier_ranking: Array<{
        supplier: string;
        score: number;
        projects: number;
    }>;
    recent_activity: RecentActivityItem[] | string[];
    supplier_intelligence?: {
        top_suppliers_by_score: Array<{ supplier: string; score: number; projects: number }>;
        average_supplier_score: number;
        high_risk_suppliers: Array<{ id: string; supplier: string; score: number }>;
        suppliers_by_region: Array<{ region: string; count: number }>;
    } | null;
    procurement_insights?: ProcurementInsightsPayload | null;
}

interface Kpis {
    active_projects: number;
    packages_in_progress: number;
    rfqs_issued: number;
    pending_clarifications: number;
    supplier_registrations_pending: number;
    overdue_deadlines: number;
    org_overdue_tasks?: number;
    org_tasks_due_today?: number;
}

function DashboardMetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
            <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>
            <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 rounded-xl border border-border-soft" />
                <Skeleton className="h-48 rounded-xl border border-border-soft" />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { auth, kpis } = usePage().props as SharedPageProps & {
        kpis?: Kpis;
    };
    const userName = auth.user?.name ?? 'User';
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [metricsError, setMetricsError] = useState(false);
    const { t } = useLocale('dashboard');

    const loadMetrics = useCallback(async () => {
        setMetricsError(false);
        setLoading(true);
        try {
            const res = await fetch('/dashboard/metrics', { credentials: 'same-origin' });
            if (!res.ok) {
                throw new Error('Failed to load metrics');
            }
            const data = (await res.json()) as DashboardMetrics;
            setMetrics(data);
        } catch {
            setMetricsError(true);
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadMetrics();
    }, [loadMetrics]);

    const showSkeleton = loading && !metricsError;
    const showGrid = !loading && !metricsError && metrics !== null;

    return (
        <AppLayout>
            <Head title={t('title')} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-text-main">
                        {t('title')}
                    </h1>
                    <p className="mt-1 text-sm text-text-muted">
                        {t('welcome', 'dashboard', { name: userName })}
                    </p>
                </div>

                {kpis && (
                    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                        <KpiCard
                            label={t('active_projects')}
                            value={kpis.active_projects}
                            icon={FolderOpen}
                            href={route('projects.index')}
                        />
                        <KpiCard
                            label={t('packages_in_progress')}
                            value={kpis.packages_in_progress}
                            icon={PackageIcon}
                        />
                        <KpiCard
                            label={t('rfqs_issued')}
                            description={t('rfqs_issued_help')}
                            value={kpis.rfqs_issued}
                            icon={FileText}
                            href={route('rfqs.index')}
                        />
                        <KpiCard
                            label={t('pending_clarifications')}
                            value={kpis.pending_clarifications}
                            icon={MessageCircle}
                            variant={kpis.pending_clarifications > 0 ? 'warning' : 'default'}
                            href={route('rfqs.index')}
                        />
                        <KpiCard
                            label={t('supplier_registrations_pending')}
                            value={kpis.supplier_registrations_pending}
                            icon={UserCheck}
                            variant={
                                kpis.supplier_registrations_pending > 0 ? 'warning' : 'default'
                            }
                            href={route('suppliers.approval-queue')}
                        />
                        <KpiCard
                            label={t('overdue_deadlines')}
                            value={kpis.overdue_deadlines}
                            icon={AlertTriangle}
                            variant={kpis.overdue_deadlines > 0 ? 'danger' : 'default'}
                            href={route('rfqs.index')}
                        />
                    </div>
                )}

                {metricsError && (
                    <div
                        className="mb-6 flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                        role="alert"
                    >
                        <p className="text-sm text-text-main">{t('metrics_load_error')}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void loadMetrics()}>
                            {t('metrics_retry')}
                        </Button>
                    </div>
                )}

                {showSkeleton && <DashboardMetricsSkeleton />}

                {showGrid && metrics !== null && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
                        <TasksKpiCard data={metrics.tasks_kpis} />

                        <div className="col-span-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <div className="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-12 lg:col-span-8">
                                <DashboardStats
                                    rfqsInProgress={metrics.rfqs_in_progress}
                                    suppliersCount={metrics.suppliers_count}
                                    quotesReceived={metrics.quotes_received}
                                    contractsActiveCount={metrics.contracts_active_count}
                                />
                            </div>
                            <div className="col-span-12 lg:col-span-4">
                                <ContractsStatusCard data={metrics.contracts_status} />
                            </div>
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <InvoicePipelineCard data={metrics.invoice_pipeline} />
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <RFQPipelineCard
                                pipeline={metrics.pipeline}
                                rfqResponseRate={metrics.rfq_response_rate}
                            />
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <AIInsightsCard procurementInsights={metrics.procurement_insights} />
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-8">
                            <SupplierCoverageCard />
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-4">
                            <SupplierRankingCard rows={metrics.supplier_ranking} />
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <SupplierIntelligenceCard data={metrics.supplier_intelligence} />
                        </div>

                        <ContractValueCard
                            active_contracts_value={metrics.active_contracts_value}
                            pipeline_contracts_value={metrics.pipeline_contracts_value}
                        />
                        <SupplierApprovalFunnelCard data={metrics.supplier_approval_funnel} />
                        <ContractExecutionRiskCard data={metrics.execution_risk} />
                        <GovernanceRiskCard data={metrics.governance_risk} />

                        <div className="col-span-12">
                            <RecentActivityCard items={metrics.recent_activity} />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
