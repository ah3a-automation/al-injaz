import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect, useState } from 'react';
import { FileSpreadsheet, Upload, Check } from 'lucide-react';

interface ProjectInfo {
    id: string;
    name: string;
}

interface PreviewData {
    headers: string[];
    rows: Array<Record<string, string | number>>;
    total: number;
}

interface Props {
    project: ProjectInfo;
    preview: PreviewData | null;
    importJobId: string | null;
}

export default function BoqImportPreview({
    project,
    preview,
    importJobId,
}: Props) {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const confirmForm = useForm({
        import_job_id: importJobId ?? '',
    });

    useEffect(() => {
        if (importJobId) {
            confirmForm.setData('import_job_id', importJobId);
        }
    }, [importJobId]);

    const handleUpload: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setUploading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        router.post(
            route('projects.boq-import.preview', project.id),
            formData,
            {
                forceFormData: true,
                preserveState: false,
                preserveScroll: false,
                onFinish: () => setUploading(false),
                onError: () => setUploading(false),
            }
        );
    };

    const handleConfirm: FormEventHandler = (e) => {
        e.preventDefault();
        if (!importJobId) return;
        confirmForm.setData('import_job_id', importJobId);
        confirmForm.post(route('projects.boq-import.store', project.id));
    };

    return (
        <AppLayout>
            <Head title={`Import BOQ — ${project.name}`} />
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Import BOQ — {project.name}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={route('projects.show', project.id)}>Back to Project</Link>
                    </Button>
                </div>

                {!preview ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                Upload Excel File
                            </CardTitle>
                            <CardDescription>
                                Upload an Excel file (.xlsx, .xls) with BOQ items. Supports up to 5000 rows.
                                Expected columns: code, description_en, description_ar, unit, qty, unit_price,
                                revenue_amount, planned_cost, specifications.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                                        aria-label="Select Excel file"
                                        onChange={(e) =>
                                            setSelectedFile(e.target.files?.[0] ?? null)
                                        }
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={!selectedFile || uploading}
                                >
                                    <Upload className="h-4 w-4" />
                                    {uploading ? 'Uploading...' : 'Preview'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview</CardTitle>
                                <CardDescription>
                                    Showing first 100 rows of {preview.total} total. Review before confirming import.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-2 text-left font-medium">Row</th>
                                                {preview.headers.map((h) => (
                                                    <th
                                                        key={h}
                                                        className="px-4 py-2 text-left font-medium"
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.rows.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-b last:border-0 hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-2 text-muted-foreground">
                                                        {(row._row as number) ?? idx + 2}
                                                    </td>
                                                    {preview.headers.map((h) => (
                                                        <td
                                                            key={h}
                                                            className="max-w-[200px] truncate px-4 py-2"
                                                            title={String(row[h] ?? '')}
                                                        >
                                                            {String(row[h] ?? '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Confirm Import</CardTitle>
                                <CardDescription>
                                    Import will run in the background. Up to 5000 rows will be processed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form method="post" action={route('projects.boq-import.store', project.id)} onSubmit={handleConfirm} className="flex gap-2">
                                    <Button type="submit" disabled={!importJobId || confirmForm.processing}>
                                        <Check className="h-4 w-4" />
                                        Confirm Import
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            router.post(route('projects.boq-import.cancel', project.id), {
                                                data: { import_job_id: importJobId ?? '' },
                                            })
                                        }
                                    >
                                        Cancel
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
