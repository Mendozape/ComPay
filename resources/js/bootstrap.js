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
 * Axios
 */
import axios from 'axios';
window.axios = axios;

window.axios.defaults.baseURL = 'http://192.168.1.16:8000';
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

/**
 * Laravel Echo + Pusher (USED ONLY FOR REAL-TIME FEATURES LIKE CHAT)
 */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Disable debug logs unless actively debugging Pusher
Pusher.logToConsole = false;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
});
