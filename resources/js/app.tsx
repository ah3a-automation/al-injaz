import '../css/app.css';
import 'leaflet/dist/leaflet.css';
import { initEcho, resolveEchoConfig } from './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        initEcho(resolveEchoConfig(props.initialPage.props as Record<string, unknown>));

        const initialLocale = (props.initialPage.props as any).locale as string | undefined;
        if (initialLocale) {
            try {
                localStorage.setItem('locale', initialLocale);
            } catch {
                // ignore storage errors
            }
        }

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
