import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { CheckCircle2, Loader2, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';

const KNOWN_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];

const MODEL_COST_HINTS: Record<string, string> = {
    'gpt-4o-mini': '~$0.0006 per request · 10,000 requests ≈ $6',
    'gpt-4o': '~$0.08 per request · 10,000 requests ≈ $800',
    'gpt-4-turbo': '~$0.14 per request · 10,000 requests ≈ $1,400',
    'gpt-3.5-turbo': '~$0.002 per request · 10,000 requests ≈ $20',
};

function getResponseTimeColor(ms: number): string {
    if (ms < 1000) return 'text-green-600';
    if (ms < 3000) return 'text-amber-600';
    return 'text-red-600';
}

interface AiSettings {
    enabled: boolean;
    endpoint: string;
    api_key: string;
    model: string;
    sar_rate: string;
    daily_limit: string;
}

interface UsagePeriod {
    total_tokens: number;
    cost_usd: number;
    cost_sar: number;
    request_count: number;
    avg_response_ms: number | null;
}

interface AiUsage {
    today: UsagePeriod;
    this_month: UsagePeriod;
    all_time: UsagePeriod;
}

interface AiCategorySuggestionsProps {
    ai_settings: AiSettings;
    ai_usage: AiUsage;
}

export default function AiCategorySuggestions({
    ai_settings,
    ai_usage,
}: AiCategorySuggestionsProps) {
    const { t } = useLocale();
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const form = useForm({
        ai_enabled: ai_settings.enabled,
        ai_endpoint: ai_settings.endpoint,
        ai_api_key: ai_settings.api_key,
        ai_model: ai_settings.model,
        ai_sar_rate: ai_settings.sar_rate,
        ai_daily_limit: ai_settings.daily_limit,
    });

    const modelSelectValue = KNOWN_MODELS.includes(form.data.ai_model)
        ? form.data.ai_model
        : 'custom';

    const dailyLimitNum = parseFloat(ai_settings.daily_limit) || 10;
    const limitPercent = dailyLimitNum > 0
        ? (ai_usage.today.cost_usd / dailyLimitNum) * 100
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('settings.ai-category-suggestions.update'), {
            preserveScroll: true,
        });
    };

    const handleTestConnection = async () => {
        setTestLoading(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/category-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
                    ),
                },
                body: JSON.stringify({
                    supplier_type: 'subcontractor',
                    legal_name_en: 'Test Steel Trading Company',
                    legal_name_ar: 'شركة اختبار',
                    trade_name: 'Test',
                    website: '',
                }),
            });
            const data = (await res.json()) as { suggested_category_ids?: string[] };
            if (res.ok && Array.isArray(data.suggested_category_ids)) {
                setTestResult({
                    success: true,
                    message: `Connection successful. Returned ${data.suggested_category_ids.length} suggestion(s).`,
                });
            } else {
                setTestResult({ success: false, message: 'API responded but returned unexpected data.' });
            }
        } catch {
            setTestResult({ success: false, message: 'Connection failed. Check endpoint and API key.' });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title={t('ai_category_suggestions', 'admin')} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('ai_category_suggestions', 'admin')}
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        {t('ai_category_suggestions_desc', 'admin')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('ai_category_suggestions', 'admin')}</CardTitle>
                            <CardDescription>
                                {t('ai_category_suggestions_desc', 'admin')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="ai_enabled" className="cursor-pointer">
                                    {t('enable_ai_suggestions', 'admin')}
                                </Label>
                                <Checkbox
                                    id="ai_enabled"
                                    checked={form.data.ai_enabled}
                                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                                        form.setData('ai_enabled', checked === true)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai_endpoint">{t('ai_api_endpoint', 'admin')}</Label>
                                <Input
                                    id="ai_endpoint"
                                    value={form.data.ai_endpoint}
                                    onChange={(e) => form.setData('ai_endpoint', e.target.value)}
                                    placeholder="https://api.openai.com/v1/chat/completions"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai_api_key">{t('ai_api_key', 'admin')}</Label>
                                <Input
                                    id="ai_api_key"
                                    type="password"
                                    value={form.data.ai_api_key}
                                    onChange={(e) => form.setData('ai_api_key', e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="off"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('ai_api_key_hint', 'admin')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('ai_model', 'admin')}</Label>
                                <Select
                                    value={modelSelectValue}
                                    onValueChange={(v) => {
                                        if (v !== 'custom') {
                                            form.setData('ai_model', v);
                                        } else {
                                            form.setData('ai_model', KNOWN_MODELS.includes(form.data.ai_model) ? '' : form.data.ai_model);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">OpenAI</div>
                                        <SelectItem value="gpt-4o-mini">gpt-4o-mini — Fast &amp; cheap (recommended)</SelectItem>
                                        <SelectItem value="gpt-4o">gpt-4o — Most capable</SelectItem>
                                        <SelectItem value="gpt-4-turbo">gpt-4-turbo — Powerful</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo — Legacy fast</SelectItem>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Other / Custom</div>
                                        <SelectItem value="custom">Custom (enter manually below)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {modelSelectValue === 'custom' && (
                                    <Input
                                        value={form.data.ai_model}
                                        onChange={(e) => form.setData('ai_model', e.target.value)}
                                        placeholder="Enter model name..."
                                        className="mt-2"
                                    />
                                )}
                                <p className="text-xs text-muted-foreground">
                                    gpt-4o-mini is recommended — best balance of speed and cost.
                                </p>
                                {MODEL_COST_HINTS[form.data.ai_model] && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        {MODEL_COST_HINTS[form.data.ai_model]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai_sar_rate">{t('ai_sar_rate', 'admin')}</Label>
                                <Input
                                    id="ai_sar_rate"
                                    value={form.data.ai_sar_rate}
                                    onChange={(e) => form.setData('ai_sar_rate', e.target.value)}
                                    placeholder="3.75"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('ai_sar_rate_hint', 'admin')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai_daily_limit">{t('ai_daily_limit', 'admin')}</Label>
                                <Input
                                    id="ai_daily_limit"
                                    value={form.data.ai_daily_limit}
                                    onChange={(e) => form.setData('ai_daily_limit', e.target.value)}
                                    placeholder="10.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('ai_daily_limit_hint', 'admin')}
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{t('ai_test_connection', 'admin')}</p>
                                        <p className="text-xs text-muted-foreground">{t('ai_test_connection_hint', 'admin')}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={testLoading || !form.data.ai_enabled}
                                        onClick={handleTestConnection}
                                    >
                                        {testLoading ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin me-1" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-3 w-3 me-1" />
                                                Test Connection
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {testResult && (
                                    <div
                                        className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                                            testResult.success
                                                ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                                                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                                        }`}
                                    >
                                        {testResult.success ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        )}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('ai_usage_stats', 'admin')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('ai_period_today', 'admin')}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {ai_usage.today.total_tokens.toLocaleString()}{' '}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {t('tokens', 'admin')}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-green-600">
                                        ${Number(ai_usage.today.cost_usd).toFixed(4)} USD
                                    </p>
                                    <p className="text-sm font-medium text-blue-600">
                                        {Number(ai_usage.today.cost_sar).toFixed(4)} SAR
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {ai_usage.today.request_count} {t('requests', 'admin')}
                                        {ai_usage.today.avg_response_ms != null && (
                                            <>
                                                {' · '}
                                                <span className={getResponseTimeColor(Number(ai_usage.today.avg_response_ms))}>
                                                    {Math.round(Number(ai_usage.today.avg_response_ms))} ms {t('avg_response_ms', 'admin')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('ai_period_this_month', 'admin')}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {ai_usage.this_month.total_tokens.toLocaleString()}{' '}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {t('tokens', 'admin')}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-green-600">
                                        ${Number(ai_usage.this_month.cost_usd).toFixed(4)} USD
                                    </p>
                                    <p className="text-sm font-medium text-blue-600">
                                        {Number(ai_usage.this_month.cost_sar).toFixed(4)} SAR
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {ai_usage.this_month.request_count} {t('requests', 'admin')}
                                        {ai_usage.this_month.avg_response_ms != null && (
                                            <>
                                                {' · '}
                                                <span className={getResponseTimeColor(Number(ai_usage.this_month.avg_response_ms))}>
                                                    {Math.round(Number(ai_usage.this_month.avg_response_ms))} ms {t('avg_response_ms', 'admin')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('ai_period_all_time', 'admin')}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {ai_usage.all_time.total_tokens.toLocaleString()}{' '}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {t('tokens', 'admin')}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-green-600">
                                        ${Number(ai_usage.all_time.cost_usd).toFixed(4)} USD
                                    </p>
                                    <p className="text-sm font-medium text-blue-600">
                                        {Number(ai_usage.all_time.cost_sar).toFixed(4)} SAR
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {ai_usage.all_time.request_count} {t('requests', 'admin')}
                                        {ai_usage.all_time.avg_response_ms != null && (
                                            <>
                                                {' · '}
                                                <span className={getResponseTimeColor(Number(ai_usage.all_time.avg_response_ms))}>
                                                    {Math.round(Number(ai_usage.all_time.avg_response_ms))} ms {t('avg_response_ms', 'admin')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>{t('daily_limit_usage', 'admin')}</span>
                                    <span>
                                        ${Number(ai_usage.today.cost_usd).toFixed(4)} / ${ai_settings.daily_limit}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${
                                            limitPercent >= 90
                                                ? 'bg-red-500'
                                                : limitPercent >= 70
                                                ? 'bg-amber-500'
                                                : 'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(limitPercent, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : t('action_save', 'admin')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
