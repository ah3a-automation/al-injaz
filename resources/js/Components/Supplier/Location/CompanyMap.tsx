import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';

interface CompanyMapProps {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
}

type MapState = 'loading' | 'ready' | 'no_coords' | 'error';

const MAP_HEIGHT = 200;

function CompanyMap({
    latitude,
    longitude,
    address,
    city,
    country,
}: CompanyMapProps) {
    const { t } = useLocale();
    const hasCoords = latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude);
    const [mapState, setMapState] = useState<MapState>(() => (hasCoords ? 'loading' : 'no_coords'));
    const addressString = [address, city, country].filter(Boolean).join(', ');
    const hasAddress = addressString.length > 0;
    const query = hasCoords ? `${latitude},${longitude}` : addressString;
    const mapsUrl = (hasCoords || hasAddress)
        ? (hasCoords
            ? `https://www.google.com/maps?q=${encodeURIComponent(query)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`)
        : null;

    useEffect(() => {
        if (!hasCoords) setMapState('no_coords');
        else setMapState('ready');
    }, [hasCoords]);

    return (
        <Card className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {t('profile_location', 'supplier_portal')}
                </CardTitle>
                {mapsUrl && (
                    <a
                        href={hasCoords ? `https://www.google.com/maps?q=${latitude},${longitude}` : mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('profile_open_in_google_maps', 'supplier_portal')}
                    </a>
                )}
            </CardHeader>
            <CardContent className="space-y-3 p-5">
                {(address || city || country) && (
                    <p className="text-sm text-muted-foreground" dir="auto">
                        {[address, city, country].filter(Boolean).join(', ') || '—'}
                    </p>
                )}
                {mapState === 'no_coords' && !hasAddress && (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6" style={{ minHeight: MAP_HEIGHT }}>
                        <p className="text-center text-sm text-muted-foreground">
                            {t('profile_no_map_coords', 'supplier_portal')}
                        </p>
                    </div>
                )}
                {mapState === 'no_coords' && hasAddress && (
                    <div className="overflow-hidden rounded-lg border border-border bg-muted" style={{ height: MAP_HEIGHT }}>
                        <iframe
                            title="Supplier location map"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(addressString)}&z=16&output=embed`}
                            className="h-full w-full border-0"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}
                {mapState === 'error' && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-muted-foreground" style={{ minHeight: MAP_HEIGHT }}>
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        {t('profile_unable_to_load_map', 'supplier_portal')}
                    </div>
                )}
                {mapState === 'loading' && hasCoords && (
                    <div className="animate-pulse rounded-lg bg-muted" style={{ height: MAP_HEIGHT }} aria-hidden />
                )}
                {mapState === 'ready' && hasCoords && (
                    <div className="overflow-hidden rounded-lg border border-border bg-muted" style={{ height: MAP_HEIGHT }}>
                        <iframe
                            title="Supplier location map"
                            src={`https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`}
                            className="h-full w-full border-0"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            onLoad={() => setMapState('ready')}
                            onError={() => setMapState('error')}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default memo(CompanyMap);
