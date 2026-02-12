<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\User;
use App\Events\MessageSent;
use App\Events\MessageRead;
use App\Events\UserTyping;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * MessageController
 * Handles all chat-related operations including real-time event broadcasting.
 */
class MessageController extends Controller
{
    /**
     * Get the total count of unread messages for the authenticated user.
     * Used for the global navigation badge.
     */
    public function getGlobalUnreadCount()
    {
        $count = Message::where('receiver_id', Auth::id())
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'status' => 'success',
            'count' => $count,
        ]);
    }

    /**
     * Get contact list with search and pagination support.
     * Includes unread message counts per contact.
     */
    public function getContacts(Request $request)
    {
        $currentUserId = Auth::id();
        $searchTerm = $request->input('search', '');
        $perPage = $request->input('per_page', 10);

        // Build query excluding the current user
        $query = User::where('id', '!=', $currentUserId)
            ->select('id', 'name', 'email');

        // Apply search filter if provided
        if (!empty($searchTerm)) {
            $query->where('name', 'like', '%' . $searchTerm . '%');
        }

        // Execute pagination
        $usersPaginator = $query->paginate($perPage);
        
        // Get the list of IDs for the current page to count unread messages
        $userIds = collect($usersPaginator->items())->pluck('id');

        $unreadCounts = Message::where('receiver_id', $currentUserId)
            ->whereIn('sender_id', $userIds)
            ->whereNull('read_at')
            ->select('sender_id', DB::raw('count(*) as unread_count'))
            ->groupBy('sender_id')
            ->pluck('unread_count', 'sender_id');

        // Attach unread counts to the user objects
        $users = collect($usersPaginator->items())->map(function ($user) use ($unreadCounts) {
            $user->unread_count = $unreadCounts->get($user->id, 0);
            return $user;
        });

        return response()->json([
            'status' => 'success',
            'users' => $users,
            'pagination' => [
                'total' => $usersPaginator->total(),
                'per_page' => $usersPaginator->perPage(),
                'current_page' => $usersPaginator->currentPage(),
                'last_page' => $usersPaginator->lastPage(),
            ]
        ]);
    }

    /**
     * Retrieve message history between two users and mark them as read.
     */
    public function getMessages($receiverId)
    {
        $currentUserId = Auth::id();

        $messages = Message::with('sender:id,name')
            ->where(function ($query) use ($currentUserId, $receiverId) {
                $query->where('sender_id', $currentUserId)
                    ->where('receiver_id', $receiverId);
            })
            ->orWhere(function ($query) use ($currentUserId, $receiverId) {
                $query->where('sender_id', $receiverId)
                    ->where('receiver_id', $currentUserId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark messages as read immediately upon retrieval
        $unread = Message::where('sender_id', $receiverId)
            ->where('receiver_id', $currentUserId)
            ->whereNull('read_at');

        if ($unread->count() > 0) {
            $unread->update(['read_at' => now()]);
            // 🔥 Notify the sender that messages were read
            broadcast(new MessageRead($receiverId, $currentUserId));
        }

        return response()->json([
            'status' => 'success',
            'messages' => $messages,
        ]);
    }

    /**
     * Store and broadcast a new chat message.
     */
    public function sendMessage(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|integer|exists:users,id',
            'content' => 'required|string',
        ]);

        $message = Message::create([
            'sender_id' => Auth::id(),
            'receiver_id' => $request->receiver_id,
            'content' => $request->content,
        ]);

        $message->load('sender');

        // Broadcast event to chat channel and receiver notification channel
        broadcast(new MessageSent($message)); 

        return response()->json([
            'status' => 'success',
            'message' => $message
        ], 201);
    }

    /**
     * Mark unread messages from a specific contact as read.
     */
    public function markAsRead(Request $request)
    {
        $data = $request->validate([
            'sender_id' => 'required|integer|exists:users,id',
        ]);

        $receiverId = Auth::id();
        $senderId = $data['sender_id'];

        $unread = Message::where('sender_id', $senderId)
            ->where('receiver_id', $receiverId)
            ->whereNull('read_at');

        if ($unread->count() > 0) {
            $unread->update(['read_at' => now()]);
            
            // 🔥 Broadcast to notify the sender that their messages were read (Web/App)
            // No .toOthers() to ensure all instances sync blue ticks
            broadcast(new MessageRead($senderId, $receiverId));
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Broadcast typing status to a specific receiver.
     */
    public function typing(Request $request)
    {
        $data = $request->validate([
            'receiver_id' => 'required|integer|exists:users,id',
        ]);

        // 🔥 FIX: Pasamos explícitamente el ID del que escribe (Auth::id())
        // Usamos toOthers() para que el emisor no reciba su propio evento
        broadcast(new UserTyping($data['receiver_id'], Auth::id()))->toOthers();

        return response()->json(['status' => 'ok']);
    }
}