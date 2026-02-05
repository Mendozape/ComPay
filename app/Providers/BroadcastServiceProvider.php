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
        /*
         * ❌ DISABLED DEFAULT ROUTES
         * We disable the default Broadcast::routes() here because they are 
         * session-based and conflict with our mobile Sanctum authentication.
         * The authorization route is now manually handled in routes/api.php.
         */
        // Broadcast::routes();

        /*
         * ✅ LOAD CHANNELS
         * We still need to require the channels file to define the 
         * authorization logic for each private channel.
         */
        require base_path('routes/channels.php');
    }
}