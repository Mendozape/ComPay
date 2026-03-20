<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public $sender_id;
    public $reader_id;

    public function __construct($senderId, $readerId)
    {
        $this->sender_id = $senderId;
        $this->reader_id = $readerId;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn()
    {
        /**
         * ENVIRONMENT PREFIX:
         * We apply the same prefix logic to match the authorized channels 
         * and the mobile app listeners for read receipts.
         */
        $prefix = config('app.env') === 'production' ? 'prod_' : 'dev_';

        $ids = [$this->sender_id, $this->reader_id];
        sort($ids);

        // Dynamic channel name with prefix (dev_chat.x.y or prod_chat.x.y)
        return [new PrivateChannel($prefix . 'chat.' . implode('.', $ids))];
    }

    /**
     * The event name in Pusher/Echo.
     */
    public function broadcastAs()
    {
        return 'MessageRead';
    }

    /**
     * Data sent to the broadcast channel.
     */
    public function broadcastWith()
    {
        return [
            'sender_id' => $this->sender_id,
            'reader_id' => $this->reader_id,
        ];
    }
}