<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Services\FcmNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendChatPushNotification implements ShouldQueue
{
    public function __construct(
        private readonly FcmNotificationService $fcm
    ) {}

    public function handle(MessageSent $event): void
    {
        $this->fcm->sendChatMessageNotification($event->message);
    }
}
