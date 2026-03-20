import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import 'leaflet.heat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { MapPin, Thermometer, X, Building2, MapPinned, Layers, Users } from 'lucide-react';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let leafletIconsFixed = false;
function fixLeafletIcons() {
    if (leafletIconsFixed) return;
    leafletIconsFixed = true;
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
}

class MapErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Map failed to load. Please refresh the page.
                </div>
            );
        }
        return this.props.children;
    }
}

const MAP_CENTER: [number, number] = [24.7136, 46.6753];
const MAP_ZOOM = 6;

const RFQ_STATUS_COLORS: Record<string, string> = {
    invited: '#3b82f6',
    submitted: '#22c55e',
    awarded: '#eab308',
    not_invited: '#6b7280',
};

const CATEGORY_COLORS: Record<string, string> = {
    electrical: '#3b82f6',
    mechanical: '#f97316',
    civil: '#22c55e',
    ict: '#a855f7',
};
const DEFAULT_MARKER_COLOR = '#ef4444';

const defaultMarkerIcon = L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const projectMarkerIcon = L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function getMarkerColor(
    supplier: SupplierMapItem,
    rfqMode: boolean,
    colorByCategory: boolean
): string {
    if (rfqMode && supplier.rfq_status) {
        return RFQ_STATUS_COLORS[supplier.rfq_status] ?? DEFAULT_MARKER_COLOR;
    }
    if (colorByCategory && supplier.categories?.length) {
        const first = supplier.categories[0].name.toLowerCase();
        for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
            if (first.includes(key)) return color;
        }
        return CATEGORY_COLORS[first] ?? DEFAULT_MARKER_COLOR;
    }
    return DEFAULT_MARKER_COLOR;
}

function createColoredIcon(color: string) {
    return L.divIcon({
        className: 'supplier-marker-status',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
}

function getSupplierMarkerIcon(useCustomIcon: boolean, color: string) {
    if (useCustomIcon) {
        try {
            return createColoredIcon(color);
        } catch {
            return defaultMarkerIcon;
        }
    }
    return defaultMarkerIcon;
}

interface SupplierMapItem {
    id: string;
    legal_name_en: string;
    city: string | null;
    latitude: number;
    longitude: number;
    categories?: Array<{ id: number; name: string }>;
    capabilities?: Array<{ id: number; name: string }>;
    rfq_invited_count?: number;
    rfq_quotes_count?: number;
    awards_count?: number;
    rfq_status?: 'invited' | 'submitted' | 'awarded' | 'not_invited';
}

interface HeatmapLayerProps {
    points: Array<[number, number, number]>;
    enabled: boolean;
}

function HeatmapLayer({ points, enabled }: HeatmapLayerProps) {
    const map = useMap();
    const heatLayerRef = useRef<any>(null);
    useEffect(() => {
        if (!enabled || points.length === 0) {
            if (heatLayerRef.current) {
                heatLayerRef.current.remove();
                heatLayerRef.current = null;
            }
            return;
        }
        if (heatLayerRef.current) {
            heatLayerRef.current.remove();
            heatLayerRef.current = null;
        }
        const heat = (L as any).heatLayer(points, { radius: 25, blur: 15, maxZoom: 10 });
        heat.addTo(map);
        heatLayerRef.current = heat;
        return () => {
            if (heatLayerRef.current) {
                heatLayerRef.current.remove();
                heatLayerRef.current = null;
            }
        };
    }, [map, enabled, points]);
    return null;
}

interface BoundsSyncProps {
    onBounds: (north: number, south: number, east: number, west: number) => void;
}

function BoundsSync({ onBounds }: BoundsSyncProps) {
    const map = useMap();
    const onBoundsRef = useRef(onBounds);
    onBoundsRef.current = onBounds;

    useEffect(() => {
        const send = () => {
            const b = map.getBounds();
            onBoundsRef.current(b.getNorth(), b.getSouth(), b.getEast(), b.getWest());
        };
        map.on('moveend', send);
        return () => { map.off('moveend', send); };
    }, [map]);
    return null;
}

interface MapClickProps {
    onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickProps) {
    const map = useMap();
    const onMapClickRef = useRef(onMapClick);
    onMapClickRef.current = onMapClick;
    useEffect(() => {
        const handler = (e: L.LeafletMouseEvent) => onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        map.on('click', handler);
        return () => {
            map.off('click', handler);
        };
    }, [map]);
    return null;
}

interface CoverageMapProps {
    suppliers: SupplierMapItem[];
    stats?: {
        suppliers_visible: number;
        cities_covered: number;
        categories_covered: number;
        suppliers_near_project: number;
    };
    categories: Array<{ id: number; name: string }>;
    cities: string[];
    capabilities: Array<{ id: number; name: string }>;
    rfqs?: Array<{ id: string; rfq_number: string; title: string | null }>;
    filters: {
        category?: string;
        city?: string;
        capability?: string;
        project_lat?: string;
        project_lng?: string;
        radius_km?: string;
        rfq_id?: string;
        north?: string;
        south?: string;
        east?: string;
        west?: string;
    };
}

export default function CoverageMap({
    suppliers,
    stats = {
        suppliers_visible: 0,
        cities_covered: 0,
        categories_covered: 0,
        suppliers_near_project: 0,
    },
    categories,
    cities,
    capabilities,
    rfqs = [],
    filters,
}: CoverageMapProps) {
    fixLeafletIcons();
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [colorByCategory, setColorByCategory] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierMapItem | null>(null);
    const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBoundsRef = useRef<string>('');

    const cleanNumericFilter = (value?: string) =>
        value === undefined || value === null || value === '' || value === 'null' ? undefined : value;

    const normalizedFilters = {
        ...filters,
        category: filters.category === 'all' ? undefined : filters.category,
        city: filters.city === 'all' ? undefined : filters.city,
        capability: filters.capability === 'all' ? undefined : filters.capability,
        project_lat: cleanNumericFilter(filters.project_lat),
        project_lng: cleanNumericFilter(filters.project_lng),
        radius_km: cleanNumericFilter(filters.radius_km),
        rfq_id: filters.rfq_id === 'all' ? undefined : filters.rfq_id,
    };

    const applyFilters = useCallback(
        (next: Record<string, string | number | undefined>) => {
            const normalized: Record<string, string> = {};
            Object.entries({ ...filters, ...next }).forEach(([k, v]) => {
                if (v !== undefined && v !== 'all') normalized[k] = String(v);
            });
            router.get(route('admin.suppliers.map'), normalized, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['suppliers', 'stats', 'filters'],
            });
        },
        [filters]
    );

    const handleMapClick = useCallback(
        (lat: number, lng: number) => {
            const radius = normalizedFilters.radius_km || '100';
            applyFilters({
                project_lat: lat,
                project_lng: lng,
                radius_km: radius,
            });
        },
        [applyFilters, normalizedFilters.radius_km]
    );

    const handleBounds = useCallback(
        (north: number, south: number, east: number, west: number) => {
            const nextNorth = north.toFixed(6);
            const nextSouth = south.toFixed(6);
            const nextEast = east.toFixed(6);
            const nextWest = west.toFixed(6);

            const nextKey = `${nextNorth}|${nextSouth}|${nextEast}|${nextWest}`;
            const currentKey = `${normalizedFilters.north ?? ''}|${normalizedFilters.south ?? ''}|${normalizedFilters.east ?? ''}|${normalizedFilters.west ?? ''}`;
            if (nextKey === currentKey || nextKey === lastBoundsRef.current) {
                return;
            }

            if (boundsDebounceRef.current) {
                clearTimeout(boundsDebounceRef.current);
            }

            boundsDebounceRef.current = setTimeout(() => {
                lastBoundsRef.current = nextKey;
                applyFilters({
                    north: nextNorth,
                    south: nextSouth,
                    east: nextEast,
                    west: nextWest,
                });
            }, 350);
        },
        [applyFilters, normalizedFilters.east, normalizedFilters.north, normalizedFilters.south, normalizedFilters.west]
    );

    useEffect(() => {
        const key = `${normalizedFilters.north ?? ''}|${normalizedFilters.south ?? ''}|${normalizedFilters.east ?? ''}|${normalizedFilters.west ?? ''}`;
        if (key !== '|||') {
            lastBoundsRef.current = key;
        }
    }, [normalizedFilters.east, normalizedFilters.north, normalizedFilters.south, normalizedFilters.west]);

    useEffect(() => () => {
        if (boundsDebounceRef.current) {
            clearTimeout(boundsDebounceRef.current);
        }
    }, []);

    const heatPoints = useMemo<Array<[number, number, number]>>(
        () => suppliers.map((s) => [s.latitude, s.longitude, 0.5]),
        [suppliers]
    );

    const rfqMode = Boolean(normalizedFilters.rfq_id);
    const projectLat =
        normalizedFilters.project_lat != null && normalizedFilters.project_lat !== ''
            ? parseFloat(normalizedFilters.project_lat)
            : null;
    const projectLng =
        normalizedFilters.project_lng != null && normalizedFilters.project_lng !== ''
            ? parseFloat(normalizedFilters.project_lng)
            : null;
    const radiusKm =
        normalizedFilters.radius_km != null && normalizedFilters.radius_km !== ''
            ? parseFloat(normalizedFilters.radius_km)
            : 100;
    const hasProject =
        projectLat != null &&
        projectLng != null &&
        Number.isFinite(projectLat) &&
        Number.isFinite(projectLng);

    return (
        <AppLayout>
            <Head title="Supplier Coverage Intelligence Map" />
            <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="flex items-center gap-2 text-xl font-semibold">
                        <MapPin className="h-5 w-5" />
                        Supplier Coverage Intelligence Map
                    </h1>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Suppliers visible</span>
                        </div>
                        <p className="mt-1 text-xl font-semibold">{stats.suppliers_visible}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPinned className="h-4 w-4" />
                            <span className="text-xs font-medium">Cities covered</span>
                        </div>
                        <p className="mt-1 text-xl font-semibold">{stats.cities_covered}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Layers className="h-4 w-4" />
                            <span className="text-xs font-medium">Categories covered</span>
                        </div>
                        <p className="mt-1 text-xl font-semibold">{stats.categories_covered}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-medium">Suppliers near project</span>
                        </div>
                        <p className="mt-1 text-xl font-semibold">{stats.suppliers_near_project}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
                    <div className="min-w-[160px]">
                        <Label className="text-muted-foreground">Category</Label>
                        <Select
                            value={normalizedFilters.category ?? 'all'}
                            onValueChange={(v) => applyFilters({ category: v === 'all' ? undefined : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[160px]">
                        <Label className="text-muted-foreground">City</Label>
                        <Select
                            value={normalizedFilters.city ?? 'all'}
                            onValueChange={(v) => applyFilters({ city: v === 'all' ? undefined : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {cities.map((city) => (
                                    <SelectItem key={city} value={city}>
                                        {city}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[160px]">
                        <Label className="text-muted-foreground">Capability</Label>
                        <Select
                            value={normalizedFilters.capability ?? 'all'}
                            onValueChange={(v) => applyFilters({ capability: v === 'all' ? undefined : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {capabilities.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[90px]">
                        <Label className="text-muted-foreground">Radius (km)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={500}
                            placeholder="100"
                            value={normalizedFilters.radius_km ?? ''}
                            onChange={(e) =>
                                applyFilters({ radius_km: e.target.value || undefined })
                            }
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <Label className="text-muted-foreground">Show RFQ Suppliers</Label>
                        <Select
                            value={normalizedFilters.rfq_id ?? 'all'}
                            onValueChange={(v) => applyFilters({ rfq_id: v === 'all' ? undefined : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All RFQs</SelectItem>
                                {rfqs.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.rfq_number} {r.title ? `— ${r.title}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        variant={showHeatmap ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowHeatmap((v) => !v)}
                    >
                        <Thermometer className="mr-1 h-4 w-4" />
                        Supplier Density
                    </Button>
                    <Button
                        variant={colorByCategory ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setColorByCategory((v) => !v)}
                    >
                        Color by category
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            router.get(route('admin.suppliers.map'), {}, { preserveState: false, preserveScroll: true, replace: true })
                        }
                    >
                        Clear filters
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Click on the map to set project location. Move or zoom the map to load suppliers in the visible area.
                </p>

                <div className="relative z-0 isolate flex min-h-0 flex-1 rounded-lg border bg-card shadow-sm">
                    <div className="min-w-0 flex-1 overflow-hidden rounded-lg" style={{ width: '100%', height: '650px' }}>
                        <MapContainer
                            key="coverage-map"
                            center={MAP_CENTER}
                            zoom={MAP_ZOOM}
                            className="h-full w-full rounded-lg"
                            scrollWheelZoom
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <BoundsSync onBounds={handleBounds} />
                            <MapClickHandler onMapClick={handleMapClick} />
                            <HeatmapLayer points={heatPoints} enabled={showHeatmap} />
                            {hasProject && (
                                <>
                                    <Circle
                                        center={[projectLat as number, projectLng as number]}
                                        radius={(Number.isFinite(radiusKm) ? radiusKm : 100) * 1000}
                                        pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.6, fillOpacity: 0.1 }}
                                    />
                                    <Marker
                                        position={[projectLat as number, projectLng as number]}
                                        icon={projectMarkerIcon}
                                        zIndexOffset={1000}
                                    >
                                        <Popup>Project location (radius: {radiusKm} km)</Popup>
                                    </Marker>
                                </>
                            )}
                            <MapErrorBoundary>
                                <>
                                    {suppliers.map((supplier) => {
                                        const lat = Number(supplier.latitude);
                                        const lng = Number(supplier.longitude);
                                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                                            return null;
                                        }
                                        const useCustomIcon = rfqMode || colorByCategory;
                                        const color = getMarkerColor(supplier, rfqMode, colorByCategory);
                                        return (
                                            <Marker
                                                key={supplier.id}
                                                position={[lat, lng]}
                                                icon={getSupplierMarkerIcon(useCustomIcon, color)}
                                                eventHandlers={{
                                                    click: () => setSelectedSupplier(supplier),
                                                }}
                                            >
                                                <Popup>
                                                    <div className="min-w-[180px] text-sm">
                                                        <strong className="font-medium">
                                                            {supplier.legal_name_en}
                                                        </strong>
                                                        {supplier.city && (
                                                            <div className="text-muted-foreground">
                                                                {supplier.city}
                                                            </div>
                                                        )}
                                                        <Button
                                                            variant="link"
                                                            className="h-auto p-0 text-primary"
                                                            asChild
                                                        >
                                                            <Link href={route('suppliers.show', supplier.id)}>
                                                                View Supplier
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </>
                            </MapErrorBoundary>
                        </MapContainer>
                    </div>

                    {selectedSupplier && (
                        <div className="absolute right-0 top-0 z-20 h-full max-w-md overflow-y-auto border-l bg-card p-4 shadow-lg">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="font-semibold">Supplier Card</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedSupplier(null)}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium">{selectedSupplier.legal_name_en}</p>
                                {selectedSupplier.city && (
                                    <p className="text-muted-foreground">
                                        City: {selectedSupplier.city}
                                    </p>
                                )}
                                {selectedSupplier.categories?.length ? (
                                    <p>
                                        <span className="text-muted-foreground">Categories: </span>
                                        {selectedSupplier.categories.map((c) => c.name).join(', ')}
                                    </p>
                                ) : null}
                                {selectedSupplier.capabilities?.length ? (
                                    <p>
                                        <span className="text-muted-foreground">Capabilities: </span>
                                        {selectedSupplier.capabilities.map((c) => c.name).join(', ')}
                                    </p>
                                ) : null}
                                <div className="border-t pt-2">
                                    <p className="font-medium text-muted-foreground">RFQ Stats</p>
                                    <p>Invited: {selectedSupplier.rfq_invited_count ?? 0}</p>
                                    <p>Quotes: {selectedSupplier.rfq_quotes_count ?? 0}</p>
                                    <p>Awards: {selectedSupplier.awards_count ?? 0}</p>
                                </div>
                                <Button asChild className="mt-2 w-full">
                                    <Link href={route('suppliers.show', selectedSupplier.id)}>
                                        Open Supplier Profile
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {rfqMode && (
                    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-2 text-xs">
                        <span className="font-medium">Marker legend:</span>
                        <span className="flex items-center gap-1">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ background: RFQ_STATUS_COLORS.invited }}
                            />
                            Invited
                        </span>
                        <span className="flex items-center gap-1">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ background: RFQ_STATUS_COLORS.submitted }}
                            />
                            Submitted
                        </span>
                        <span className="flex items-center gap-1">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ background: RFQ_STATUS_COLORS.awarded }}
                            />
                            Awarded
                        </span>
                        <span className="flex items-center gap-1">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ background: RFQ_STATUS_COLORS.not_invited }}
                            />
                            Not invited
                        </span>
                    </div>
                )}

                {colorByCategory && !rfqMode && (
                    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-2 text-xs">
                        <span className="font-medium">Category colors:</span>
                        {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
                            <span key={name} className="flex items-center gap-1">
                                <span
                                    className="inline-block h-3 w-3 rounded-full capitalize"
                                    style={{ background: color }}
                                />
                                {name}
                            </span>
                        ))}
                        <span className="flex items-center gap-1">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ background: DEFAULT_MARKER_COLOR }}
                            />
                            Other
                        </span>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
