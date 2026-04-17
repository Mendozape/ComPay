<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        /**
         * HYBRID AUTHENTICATION FOR BROADCASTING
         * We use both 'web' and 'auth:sanctum' middlewares.
         * - 'web': Allows the PC/Browser to authorize via Session Cookies.
         * - 'auth:sanctum': Allows the Mobile App to authorize via API Tokens.
         * This prevents the PC version from breaking while enabling the App.
         */
        //Broadcast::routes(['middleware' => ['auth:sanctum']]);
        Broadcast::routes([
            'prefix' => 'api',
            'middleware' => ['api', 'auth:sanctum']
        ]);

        /**
         * LOAD CHANNEL DEFINITIONS
         * Requires the channels.php file where the 'prod_' prefixes 
         * and authorization logic are defined.
         */
        require base_path('routes/channels.php');
    }
}
