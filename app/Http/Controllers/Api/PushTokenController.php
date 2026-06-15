<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushTokenController extends Controller
{
    /**
     * Register or update the device FCM/APNs token for the authenticated user.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string|max:512',
            'platform' => 'required|string|in:android,ios',
            'device_name' => 'nullable|string|max:255',
        ]);

        PushToken::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'token' => $data['token'],
            ],
            [
                'platform' => $data['platform'],
                'device_name' => $data['device_name'] ?? null,
            ]
        );

        return response()->json(['status' => 'success']);
    }

    /**
     * Remove a device token (logout / uninstall).
     */
    public function destroy(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string|max:512',
        ]);

        PushToken::where('user_id', Auth::id())
            ->where('token', $data['token'])
            ->delete();

        return response()->json(['status' => 'success']);
    }
}
