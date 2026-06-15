<?php

namespace App\Services;

use App\Models\Message;
use App\Models\PushToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends push notifications via Firebase Cloud Messaging HTTP v1 API.
 */
class FcmNotificationService
{
    private ?string $accessToken = null;

    private ?int $tokenExpiresAt = null;

    public function isConfigured(): bool
    {
        $credentials = config('firebase.credentials');
        $projectId = config('firebase.project_id');

        return $projectId && $credentials && is_readable($credentials);
    }

    /**
     * Notify all devices of the message receiver.
     */
    public function sendChatMessageNotification(Message $message): void
    {
        if (!$this->isConfigured()) {
            Log::warning('[FCM] Skipped push: Firebase not configured (FIREBASE_PROJECT_ID / FIREBASE_CREDENTIALS).');
            return;
        }

        $message->loadMissing('sender');

        $tokens = PushToken::where('user_id', $message->receiver_id)->get();
        if ($tokens->isEmpty()) {
            Log::info('[FCM] No push tokens for receiver', ['user_id' => $message->receiver_id]);
            return;
        }

        $senderName = $message->sender?->name ?? 'Usuario';
        $preview = mb_strlen($message->content) > 120
            ? mb_substr($message->content, 0, 117) . '...'
            : $message->content;

        $body = "{$senderName}: {$preview}";

        $data = [
            'type' => 'chat',
            'sender_id' => (string) $message->sender_id,
            'sender_name' => $senderName,
            'message_id' => (string) $message->id,
        ];

        foreach ($tokens as $pushToken) {
            $this->sendToDevice(
                $pushToken->token,
                $pushToken->platform,
                'Notificacion',
                $body,
                $data
            );
        }
    }

    public function sendToDevice(
        string $deviceToken,
        string $platform,
        string $title,
        string $body,
        array $data = []
    ): bool {
        if (!$this->isConfigured()) {
            return false;
        }

        $accessToken = $this->getAccessToken();
        if (!$accessToken) {
            return false;
        }

        $projectId = config('firebase.project_id');
        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $stringData = [];
        foreach ($data as $key => $value) {
            $stringData[(string) $key] = (string) $value;
        }

        $payload = [
            'message' => [
                'token' => $deviceToken,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => $stringData,
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'channel_id' => 'chat-messages',
                        'sound' => 'default',
                    ],
                ],
                'apns' => [
                    'headers' => [
                        'apns-priority' => '10',
                    ],
                    'payload' => [
                        'aps' => [
                            'sound' => 'default',
                            'badge' => 1,
                            'alert' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($url, $payload);

            if ($response->successful()) {
                return true;
            }

            if ($response->status() === 404 || str_contains($response->body(), 'UNREGISTERED')) {
                PushToken::where('token', $deviceToken)->delete();
            }

            Log::warning('[FCM] Send failed', [
                'status' => $response->status(),
                'body' => $response->json() ?? $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('[FCM] Exception: ' . $e->getMessage());
        }

        return false;
    }

    private function getAccessToken(): ?string
    {
        if ($this->accessToken && $this->tokenExpiresAt && time() < $this->tokenExpiresAt - 60) {
            return $this->accessToken;
        }

        $credentialsPath = config('firebase.credentials');
        if (!is_readable($credentialsPath)) {
            return null;
        }

        $credentials = json_decode(file_get_contents($credentialsPath), true);
        if (!$credentials || empty($credentials['client_email']) || empty($credentials['private_key'])) {
            Log::warning('[FCM] Invalid credentials file');
            return null;
        }

        try {
            $jwt = $this->createJwtAssertion($credentials);
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (!$response->successful()) {
                Log::warning('[FCM] OAuth failed', ['body' => $response->body()]);
                return null;
            }

            $this->accessToken = $response->json('access_token');
            $expiresIn = (int) $response->json('expires_in', 3600);
            $this->tokenExpiresAt = time() + $expiresIn;

            return $this->accessToken;
        } catch (\Throwable $e) {
            Log::warning('[FCM] Token error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * @param array<string, mixed> $credentials
     */
    private function createJwtAssertion(array $credentials): string
    {
        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = $this->base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $unsigned = "{$header}.{$claim}";
        $privateKey = openssl_pkey_get_private($credentials['private_key']);
        if ($privateKey === false) {
            throw new \RuntimeException('Invalid Firebase private key');
        }

        openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        return $unsigned . '.' . $this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
