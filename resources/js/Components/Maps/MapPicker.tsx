import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753]; // Riyadh

interface LocationMarkerProps {
    position: [number, number] | null;
    onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onChange }: LocationMarkerProps) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });

    if (!position) {
        return null;
    }

    return (
        <Marker
            position={position}
            draggable
            eventHandlers={{
                dragend(e) {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    onChange(pos.lat, pos.lng);
                },
            }}
        />
    );
}

interface MapPickerProps {
    latitude?: number | null;
    longitude?: number | null;
    onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
    const center = useMemo((): [number, number] => {
        if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            return [latitude, longitude];
        }
        return DEFAULT_CENTER;
    }, [latitude, longitude]);

    const markerPosition = useMemo((): [number, number] | null => {
        if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            return [latitude, longitude];
        }
        return null;
    }, [latitude, longitude]);

    return (
        <div className="relative">
            <MapContainer
                center={center}
                zoom={16}
                className="h-[300px] w-full rounded-lg cursor-crosshair"
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={markerPosition} onChange={onChange} />
            </MapContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-primary" />
            </div>
        </div>
    );
}
