/**
 * jQuery (required by AdminLTE)
 */
import jQuery from 'jquery';
window.$ = jQuery;
window.jQuery = jQuery;

/**
 * Bootstrap + dependencies
 */
import * as Popper from '@popperjs/core';
window.Popper = Popper;
import 'bootstrap';

/**
 * SweetAlert2
 */
import Swal from 'sweetalert2';
window.Swal = Swal;

/**
 * Toastr Notifications
 */
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
window.toastr = toastr;

// Global Toastr Configuration
window.toastr.options = {
    "positionClass": "toast-top-right",
    "progressBar": true,
    "timeOut": "4000",
    "closeButton": true
};

/**
 * Axios
 */
import axios from 'axios';
window.axios = axios;

// Base API configuration
window.axios.defaults.baseURL = 'http://192.168.1.16:8000';
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

/**
 * Global Axios Response Interceptor
 */
window.axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            const status = error.response.status;

            // Handle unauthorized or expired session
            if (status === 401 || status === 419) {
                if (window.location.pathname !== '/') {
                    
                    // Notify user via Toastr before redirect
                    toastr.error("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.", "Sesión Perdida");

                    if (window.Echo) {
                        window.Echo.disconnect();
                    }

                    // Wait for the user to see the message before redirecting
                    setTimeout(() => {
                        window.location.assign('/');
                    }, 2000);
                }
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Laravel Echo + Pusher
 */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;
Pusher.logToConsole = false;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    authEndpoint: '/api/broadcasting/auth',
    auth: {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
        }
    }
});