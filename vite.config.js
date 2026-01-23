import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
    server: {
        host: '192.168.1.16',
        // Allow connections from any origin to prevent CORS blocks
        cors: true, 
        // Ensure Hot Module Replacement points to the correct IP
        hmr: {
            host: '192.168.1.16',
        },
    },
    plugins: [
        react(),
        laravel({
            input: [
                'resources/js/app.js',
                'resources/js/ReactApp.jsx',
            ],
            refresh: true, // Auto-reload browser on changes
        }),
    ],
    resolve: {
        alias: {
            // Setup aliases for Bootstrap and jQuery
            '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
            '$': 'jquery', 
        }
    },
});