<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Firebase Cloud Messaging (FCM)
    |--------------------------------------------------------------------------
    |
    | 1. Firebase Console → Project settings → Service accounts
    | 2. Generate new private key → save as storage/app/firebase-credentials.json
    | 3. Set FIREBASE_CREDENTIALS and FIREBASE_PROJECT_ID in .env
    |
    */

    'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase-credentials.json')),

    'project_id' => env('FIREBASE_PROJECT_ID'),

];
