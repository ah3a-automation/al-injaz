import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { FileSpreadsheet } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    name_en?: string;
}

interface BoqImportIndexProps {
    projects: Project[];
}

export default function BoqImportIndex({ projects }: BoqImportIndexProps) {
    return (
        <AppLayout>
            <Head title="BOQ Import" />
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        BOQ Import
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Select a project to import BOQ from Excel.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Select Project
                        </CardTitle>
                        <CardDescription>
                            Choose a project to import or update its Bill of Quantities.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={route('projects.boq-import.show', project.id)}
                                >
                                    <Button
                                        variant="outline"
                                        className="h-auto w-full justify-start gap-2 py-3"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {project.name_en ?? project.name}
                                        </span>
                                    </Button>
                                </Link>
                            ))}
                        </div>
                        {projects.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                                No projects found. Create a project first.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
