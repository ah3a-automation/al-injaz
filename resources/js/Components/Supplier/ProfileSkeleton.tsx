import { Card, CardContent, CardHeader } from '@/Components/ui/card';

export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <Card className="overflow-hidden rounded-xl">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="rounded-xl">
                        <CardHeader className="pb-2">
                            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-4 animate-pulse rounded bg-muted" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card className="rounded-xl">
                        <CardHeader className="pb-2">
                            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
