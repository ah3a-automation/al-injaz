import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

declare global {
    interface Window {
        Echo?: Echo<any>;
        Pusher?: typeof Pusher;
    }
}

/** Matches Inertia shared prop `reverb` from HandleInertiaRequests. */
export interface SharedReverbProps {
    key: string;
    host: string;
    port: number;
    scheme: 'http' | 'https';
}

interface ChannelAuthorizationResponse {
    auth: string;
    channel_data?: string;
    shared_secret?: string;
}

function csrfToken(): string {
    return typeof document !== 'undefined'
        ? (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? ''
        : '';
}

function echoConfigFromVite(): SharedReverbProps | null {
    const broadcastConnection = import.meta.env.VITE_BROADCAST_CONNECTION as string | undefined;
    const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
    if (broadcastConnection !== 'reverb' || !key) {
        return null;
    }
    const schemeRaw = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'http';
    return {
        key,
        host:
            (import.meta.env.VITE_REVERB_HOST as string | undefined) ??
            (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'),
        port: Number((import.meta.env.VITE_REVERB_PORT as string | undefined) ?? 8080),
        scheme: schemeRaw === 'https' ? 'https' : 'http',
    };
}

/**
 * Prefer server-provided Reverb endpoint (correct for Docker: browser host vs internal REVERB_HOST).
 */
export function resolveEchoConfig(
    pageProps: Record<string, unknown> | undefined,
): SharedReverbProps | null {
    const raw = pageProps?.reverb;
    if (
        raw &&
        typeof raw === 'object' &&
        typeof (raw as SharedReverbProps).key === 'string' &&
        (raw as SharedReverbProps).key !== '' &&
        typeof (raw as SharedReverbProps).host === 'string' &&
        typeof (raw as SharedReverbProps).port === 'number'
    ) {
        const scheme = (raw as SharedReverbProps).scheme === 'https' ? 'https' : 'http';
        return {
            key: (raw as SharedReverbProps).key,
            host: (raw as SharedReverbProps).host,
            port: (raw as SharedReverbProps).port,
            scheme,
        };
    }
    return echoConfigFromVite();
}

export function initEcho(config: SharedReverbProps | null): void {
    if (!config) {
        return;
    }

    const existing = window.Echo as unknown as { disconnect?: () => void } | undefined;
    try {
        existing?.disconnect?.();
    } catch {
        // ignore
    }
    window.Echo = undefined;

    window.Pusher = Pusher;

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        enabledTransports: ['ws'],
        authorizer: (channel: { name: string }) => ({
            authorize: (
                socketId: string,
                callback: (error: Error | null, data: ChannelAuthorizationResponse | null) => void,
            ) => {
                axios
                    .post(
                        '/broadcasting/auth',
                        new URLSearchParams({
                            socket_id: socketId,
                            channel_name: channel.name,
                        }).toString(),
                        {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-CSRF-TOKEN': csrfToken(),
                                Accept: 'application/json',
                            },
                            withCredentials: true,
                        },
                    )
                    .then((response: { data: ChannelAuthorizationResponse }) => {
                        callback(null, response.data);
                    })
                    .catch((error: unknown) => {
                        if (import.meta.env.DEV) {
                            console.debug('[Echo authorizer] auth failed', {
                                channelName: channel.name,
                                socketId,
                                error,
                            });
                        }

                        callback(
                            error instanceof Error
                                ? error
                                : new Error('Broadcast authorization failed'),
                            null,
                        );
                    });
            },
        }),
    });
}
