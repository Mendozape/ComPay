<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

/**
 * ENVIRONMENT PREFIX LOGIC
 * We must match the same prefix logic used in the MessageSent event 
 * to allow Pusher to authorize the subscription.
 */
$prefix = config('app.env') === 'production' ? 'prod_' : 'dev_';

// Canal para notificaciones/badge del usuario (con prefijo dinámico)
Broadcast::channel($prefix . 'App.Models.User.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

/**
 * Authorization for the private chat channel.
 * Channel format: '[prefix]chat.[user_id_1].[user_id_2]'
 * This callback verifies that the currently authenticated user ($user) 
 * is one of the two participants in the channel name.
 */
Broadcast::channel($prefix . 'chat.{firstUserId}.{secondUserId}', function ($user, $firstUserId, $secondUserId) {
    // Convert IDs to integers
    $u1 = (int) $firstUserId;
    $u2 = (int) $secondUserId;
    
    // The authenticated user MUST be either the first ID OR the second ID.
    return (int) $user->id === $u1 || (int) $user->id === $u2;
});