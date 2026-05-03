import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

(window as any).Pusher = Pusher;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const host = apiBaseUrl.replace(/^https?:\/\//, '');

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || '6wioz8fx9aiiukh9ycj7',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: any) => {
        return {
            authorize: (socketId: any, callback: any) => {
                const token = localStorage.getItem('token');
                fetch(`${apiBaseUrl}/api/broadcasting/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        callback(false, data);
                    })
                    .catch((error) => {
                        callback(true, error);
                    });
            },
        };
    },
});

(window as any).Echo = echo;

export default echo;

