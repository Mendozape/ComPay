@extends('adminlte::page')

@section('title', 'Admin Panel')

@section('content')
    {{-- React root container - MANDATORY --}}
    <div id="react-container"></div>
@stop

@section('js')
    {{-- Pass Laravel data to React --}}
    <script>
        @php
            // We merge the env directly into the data array using PHP
            $laravelData = $data ?? [];
            $laravelData['env'] = config('app.env');
        @endphp

        /**
         * We inject the environment and data into the window object.
         * This way, React can access window.Laravel.env to handle Pusher prefixes.
         */
        window.Laravel = @json($laravelData);
    </script>

    {{-- Load Vite React assets --}}
    @viteReactRefresh
    @vite(['resources/js/app.js', 'resources/js/ReactApp.jsx'])
@stop