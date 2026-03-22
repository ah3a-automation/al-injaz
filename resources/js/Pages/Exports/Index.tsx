import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Head, router } from '@inertiajs/react'
import { Download, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useLocale } from '@/hooks/useLocale'

interface ExportRecord {
    id: string
    type: string
    format: 'xlsx' | 'pdf'
    status: 'pending' | 'processing' | 'completed' | 'failed'
    error_message: string | null
    file_path: string | null
    expires_at: string | null
    created_at: string
}

interface PaginatedExports {
    data: ExportRecord[]
    links: { url: string | null; label: string; active: boolean }[]
    current_page: number
    last_page: number
    total: number
    per_page: number
    from: number | null
    to: number | null
}

interface Props {
    exports: PaginatedExports
}

function truncate(value: string | null, max: number): string {
    if (!value) return '—'
    return value.length > max ? `${value.slice(0, max)}…` : value
}

export default function Index({ exports }: Props) {
    const { t } = useLocale('exports')

    const records = exports?.data ?? []
    const links = exports?.links ?? []

    const previousRef = useRef<ExportRecord[] | null>(null)

    const downloadExport = useCallback(
        async (id: string) => {
            try {
                const res = await fetch(`/exports/${id}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                })

                const data = await res.json()

                if (data.download_url) {
                    window.open(data.download_url, '_blank')
                } else {
                    toast.error(t('toast_not_ready'))
                }
            } catch {
                toast.error(t('toast_download_failed'))
            }
        },
        [t]
    )

    const retryExport = useCallback(
        async (id: string) => {
            try {
                const csrf =
                    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                        ?.content ?? ''

                const res = await fetch(`/exports/${id}/retry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                })

                if (!res.ok) {
                    const data = await res.json()
                    toast.error(
                        typeof data.error === 'string' ? data.error : t('toast_retry_failed')
                    )
                    return
                }

                toast.info(t('toast_queued_again'))
                router.reload({ only: ['exports'] })
            } catch {
                toast.error(t('toast_retry_failed'))
            }
        },
        [t]
    )

    const hasPending = records.some(
        (e) => e.status === 'pending' || e.status === 'processing'
    )

    useEffect(() => {
        if (!hasPending) return

        const timer = setInterval(() => {
            router.reload({ only: ['exports'] })
        }, 3000)

        return () => clearInterval(timer)
    }, [hasPending])

    useEffect(() => {
        const previous = previousRef.current
        if (!previous) {
            previousRef.current = records
            return
        }

        records.forEach((current) => {
            const prev = previous.find((p) => p.id === current.id)
            if (!prev || prev.status === current.status) return

            if (
                (prev.status === 'pending' || prev.status === 'processing') &&
                current.status === 'completed'
            ) {
                toast.success(
                    t('toast_export_ready', undefined, {
                        type: current.type,
                        format: current.format,
                    })
                )
            }

            if (current.status === 'failed') {
                toast.error(current.error_message ?? t('toast_export_failed'))
            }
        })

        previousRef.current = records
    }, [records, t])

    function visit(url: string | null) {
        if (!url) return
        router.visit(url, { preserveScroll: true })
    }

    const paginationSummary = t('pagination_showing', 'exports', {
        from: exports.from ?? 0,
        to: exports.to ?? 0,
        total: exports.total ?? 0,
    })

    return (
        <AppLayout>
            <Head title={t('title_page')} />

            <div className="space-y-6">
                <h1 className="text-2xl font-semibold">{t('heading')}</h1>

                {records.length === 0 ? (
                    <div className="border border-dashed p-10 text-center text-muted-foreground">
                        <Download className="mx-auto mb-4 h-8 w-8 opacity-50" />
                        {t('empty_state')}
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden border rounded">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-3 text-left">{t('col_type')}</th>
                                        <th className="p-3 text-left">{t('col_format')}</th>
                                        <th className="p-3 text-left">{t('col_status')}</th>
                                        <th className="p-3 text-left">{t('col_error')}</th>
                                        <th className="p-3 text-left">{t('col_file')}</th>
                                        <th className="p-3 text-left">{t('col_download')}</th>
                                        <th className="p-3 text-left">{t('col_created')}</th>
                                        <th className="p-3 text-left">{t('col_retry')}</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {records.map((exp) => (
                                        <tr key={exp.id} className="border-t">
                                            <td className="p-3">{exp.type}</td>

                                            <td className="p-3 uppercase">{exp.format}</td>

                                            <td className="p-3">
                                                {exp.status === 'pending' && (
                                                    <Badge variant="secondary">
                                                        {t('status_pending')}
                                                    </Badge>
                                                )}

                                                {exp.status === 'processing' && (
                                                    <Badge>
                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                        {t('status_processing')}
                                                    </Badge>
                                                )}

                                                {exp.status === 'completed' && (
                                                    <Badge variant="success">
                                                        {t('status_completed')}
                                                    </Badge>
                                                )}

                                                {exp.status === 'failed' && (
                                                    <Badge variant="destructive">
                                                        {t('status_failed')}
                                                    </Badge>
                                                )}
                                            </td>

                                            <td className="p-3">
                                                {truncate(exp.error_message, 40)}
                                            </td>

                                            <td className="p-3">
                                                {truncate(exp.file_path, 40)}
                                            </td>

                                            <td className="p-3">
                                                {exp.status === 'completed' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            downloadExport(exp.id)
                                                        }
                                                    >
                                                        {t('action_download')}
                                                    </Button>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>

                                            <td className="p-3">
                                                {new Date(
                                                    exp.created_at
                                                ).toLocaleString()}
                                            </td>

                                            <td className="p-3">
                                                {exp.status === 'failed' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            retryExport(exp.id)
                                                        }
                                                    >
                                                        {t('action_retry')}
                                                    </Button>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <span className="text-sm text-muted-foreground">
                                {paginationSummary}
                            </span>

                            <div className="flex gap-2">
                                {links.map((link, i) => (
                                    <Button
                                        key={i}
                                        size="sm"
                                        variant={link.active ? 'default' : 'outline'}
                                        disabled={!link.url}
                                        onClick={() => visit(link.url)}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    )
}
