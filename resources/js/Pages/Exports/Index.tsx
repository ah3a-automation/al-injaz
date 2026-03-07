import AppLayout from '@/Layouts/AppLayout'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Head, router } from '@inertiajs/react'
import { Download, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

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

async function downloadExport(id: string) {
    try {
        const res = await fetch(`/exports/${id}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })

        const data = await res.json()

        if (data.download_url) {
            window.open(data.download_url, '_blank')
        } else {
            toast.error('Export not ready yet')
        }
    } catch {
        toast.error('Download failed')
    }
}

async function retryExport(id: string) {
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
            toast.error(data.error ?? 'Retry failed')
            return
        }

        toast.info('Export queued again')
        router.reload({ only: ['exports'] })
    } catch {
        toast.error('Retry failed')
    }
}

export default function Index({ exports }: Props) {
    console.log('exports.data length:', exports?.data?.length)
    console.log('exports.total:', exports?.total)
    console.log('raw exports:', JSON.stringify(exports).substring(0, 300))

    const records = exports?.data ?? []
    const links = exports?.links ?? []

    const previousRef = useRef<ExportRecord[] | null>(null)

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
                toast.success(`${current.type} ${current.format} export ready`)
            }

            if (current.status === 'failed') {
                toast.error(current.error_message ?? 'Export failed')
            }
        })

        previousRef.current = records
    }, [records])

    function visit(url: string | null) {
        if (!url) return
        router.visit(url, { preserveScroll: true })
    }

    return (
        <AppLayout>
            <Head title="Exports" />

            <div className="space-y-6">
                <h1 className="text-2xl font-semibold">Exports</h1>

                {records.length === 0 ? (
                    <div className="border border-dashed p-10 text-center text-muted-foreground">
                        <Download className="mx-auto mb-4 h-8 w-8 opacity-50" />
                        No exports yet
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden border rounded">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-left">Format</th>
                                        <th className="p-3 text-left">Status</th>
                                        <th className="p-3 text-left">Error</th>
                                        <th className="p-3 text-left">File</th>
                                        <th className="p-3 text-left">Download</th>
                                        <th className="p-3 text-left">Created</th>
                                        <th className="p-3 text-left">Retry</th>
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
                                                        Pending
                                                    </Badge>
                                                )}

                                                {exp.status === 'processing' && (
                                                    <Badge>
                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                        Processing
                                                    </Badge>
                                                )}

                                                {exp.status === 'completed' && (
                                                    <Badge variant="success">
                                                        Completed
                                                    </Badge>
                                                )}

                                                {exp.status === 'failed' && (
                                                    <Badge variant="destructive">
                                                        Failed
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
                                                        Download
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
                                                        Retry
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

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-4">
                            <span className="text-sm text-muted-foreground">
                                Showing {exports.from ?? 0}–{exports.to ?? 0} of{' '}
                                {exports.total ?? 0}
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