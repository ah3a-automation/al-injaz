import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import type { Project, ProjectStatus } from '@/types/projects';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

interface EditProps {
    project: Project;
}

export default function Edit({ project }: EditProps) {
    const form = useForm({
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        start_date: project.start_date ?? '',
        end_date: project.end_date ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('projects.update', project.id));
    };

    return (
        <AppLayout>
            <Head title={`Edit ${project.name}`} />

            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Edit Project
                    </h1>

                    <Button variant="outline" asChild>
                        <Link href={route('projects.show', project.id)}>
                            Cancel
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Project details</CardTitle>
                        <CardDescription>
                            Update project information.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    required
                                    aria-invalid={!!form.errors.name}
                                />

                                {form.errors.name && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Description
                                </Label>

                                <textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData(
                                            'description',
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    aria-invalid={!!form.errors.description}
                                />

                                {form.errors.description && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.description}
                                    </p>
                                )}
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>

                                <select
                                    id="status"
                                    value={form.data.status}
                                    onChange={(e) =>
                                        form.setData(
                                            'status',
                                            e.target.value as ProjectStatus
                                        )
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                    <option value="on_hold">On hold</option>
                                </select>

                                {form.errors.status && (
                                    <p className="text-sm text-destructive">
                                        {form.errors.status}
                                    </p>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid gap-4 sm:grid-cols-2">

                                <div className="space-y-2">
                                    <Label htmlFor="start_date">
                                        Start date
                                    </Label>

                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={
                                            typeof form.data.start_date ===
                                            'string'
                                                ? form.data.start_date.slice(
                                                      0,
                                                      10
                                                  )
                                                : ''
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                'start_date',
                                                e.target.value
                                            )
                                        }
                                        aria-invalid={
                                            !!form.errors.start_date
                                        }
                                    />

                                    {form.errors.start_date && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.start_date}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end_date">
                                        End date
                                    </Label>

                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={
                                            typeof form.data.end_date ===
                                            'string'
                                                ? form.data.end_date.slice(
                                                      0,
                                                      10
                                                  )
                                                : ''
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                'end_date',
                                                e.target.value
                                            )
                                        }
                                        aria-invalid={!!form.errors.end_date}
                                    />

                                    {form.errors.end_date && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.end_date}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-4">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    Save changes
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                >
                                    <Link
                                        href={route(
                                            'projects.show',
                                            project.id
                                        )}
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}