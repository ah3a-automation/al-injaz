import AppLayout from '@/Layouts/AppLayout';
import { AIInsightsCard } from '@/Components/dashboard/AIInsightsCard';
import { DashboardStats } from '@/Components/dashboard/DashboardStats';
import { RecentActivityCard } from '@/Components/dashboard/RecentActivityCard';
import { RFQPipelineCard } from '@/Components/dashboard/RFQPipelineCard';
import { SupplierCoverageCard } from '@/Components/dashboard/SupplierCoverageCard';
import { SupplierIntelligenceCard } from '@/Components/dashboard/SupplierIntelligenceCard';
import { SupplierRankingCard } from '@/Components/dashboard/SupplierRankingCard';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { SharedPageProps } from '@/types';
import { useLocale } from '@/hooks/useLocale';
import type { ProcurementInsightsPayload } from '@/Components/dashboard/AIInsightsCard';
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
    contracts_awarded: number;
    pipeline: {
        draft: number;
        sent: number;
        quotes_received: number;
        evaluation: number;
        awarded: number;
    };
    supplier_ranking: Array<{
        supplier: string;
        score: number;
        projects: number;
    }>;
    recent_activity: string[];
    supplier_intelligence?: {
        top_suppliers_by_score: Array<{ supplier: string; score: number; projects: number }>;
        average_supplier_score: number;
        high_risk_suppliers: Array<{ supplier: string; score: number }>;
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
}

export default function Dashboard() {
    const { auth, kpis } = usePage().props as SharedPageProps & {
        kpis?: Kpis;
    };
    const userName = auth.user?.name ?? 'User';
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLocale('dashboard');

    useEffect(() => {
        fetch('/dashboard/metrics', { credentials: 'same-origin' })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load metrics');
                return res.json();
            })
            .then((data: DashboardMetrics) => setMetrics(data))
            .catch(() => setMetrics(null))
            .finally(() => setLoading(false));
    }, []);

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
                            href={route('suppliers.index')}
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

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
                        <div className="col-span-12 flex items-center justify-center rounded-xl border border-border-soft bg-white p-12 shadow-sm">
                            <p className="text-sm text-slate-500">{t('loading')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
                        <DashboardStats
                            rfqsInProgress={metrics?.rfqs_in_progress}
                            suppliersCount={metrics?.suppliers_count}
                            quotesReceived={metrics?.quotes_received}
                            contractsActive={metrics?.contracts_awarded}
                        />

                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <RFQPipelineCard pipeline={metrics?.pipeline} />
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <AIInsightsCard procurementInsights={metrics?.procurement_insights} />
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-8">
                            <SupplierCoverageCard />
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-4">
                            <SupplierRankingCard rows={metrics?.supplier_ranking} />
                        </div>

                        <div className="col-span-12 md:col-span-6 lg:col-span-6">
                            <SupplierIntelligenceCard data={metrics?.supplier_intelligence} />
                        </div>

                        <div className="col-span-12">
                            <RecentActivityCard items={metrics?.recent_activity} />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
