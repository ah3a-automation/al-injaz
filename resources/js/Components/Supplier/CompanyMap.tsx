import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { MapPin, ExternalLink, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface CompanyMapProps {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
}

export default function CompanyMap({
    latitude,
    longitude,
    address,
    city,
    country,
}: CompanyMapProps) {
    const [fullscreen, setFullscreen] = useState(false);
    const hasCoords = latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude);
    const query = hasCoords
        ? `${latitude},${longitude}`
        : [address, city, country].filter(Boolean).join(', ');
    const mapsUrl = query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}` : null;

    return (
        <Card className="overflow-hidden rounded-xl shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Location
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {(address || city || country) && (
                    <p className="text-sm text-muted-foreground">
                        {[address, city, country].filter(Boolean).join(', ') || '—'}
                    </p>
                )}
                {!hasCoords && (
                    <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                        No coordinates available. Add latitude and longitude to show a map.
                    </p>
                )}
                {hasCoords && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                        <iframe
                            title="Company location"
                            src={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                            className="absolute inset-0 h-full w-full border-0"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}
                {mapsUrl && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Google Maps
                            </a>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
