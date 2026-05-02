<?php

namespace App\Events;

use App\Models\Note;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NoteUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $note;
    public $userId;

    /**
     * Create a new event instance.
     */
    public function __construct(Note $note, $userId)
    {
        $this->note = $note;
        $this->userId = $userId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('note.' . $this->note->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->note->id,
            'title' => $this->note->title,
            'content' => $this->note->content,
            'user_id' => $this->userId,
        ];
    }
}
