<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public $sender_id;
    public $receiver_id;

    /**
     * Create a new event instance.
     * 🔥 Ahora recibe ambos IDs para asegurar la consistencia.
     */
    public function __construct($receiverId, $senderId)
    {
        $this->sender_id = $senderId;
        $this->receiver_id = $receiverId;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn()
    {
        // Ordenamos los IDs para que el canal chat.1.2 sea el mismo que chat.2.1
        $ids = [$this->sender_id, $this->receiver_id];
        sort($ids);
        return [new PrivateChannel('chat.' . implode('.', $ids))];
    }

    /**
     * The event name in Pusher/Echo.
     */
    public function broadcastAs()
    {
        return 'UserTyping';
    }

    /**
     * Data sent to the broadcast channel.
     */
    public function broadcastWith()
    {
        return [
            'sender_id' => $this->sender_id,
            'receiver_id' => $this->receiver_id,
        ];
    }
}