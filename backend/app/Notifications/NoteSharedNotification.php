<?php

namespace App\Notifications;

use App\Models\Note;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NoteSharedNotification extends Notification
{
    use Queueable;

    protected $note;
    protected $sharer;

    /**
     * Create a new notification instance.
     */
    public function __construct(Note $note, User $sharer)
    {
        $this->note = $note;
        $this->sharer = $sharer;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('A note has been shared with you')
                    ->line($this->sharer->name . ' has shared a note with you: "' . $this->note->title . '"')
                    ->action('View Note', url('/'))
                    ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'note_id' => $this->note->id,
            'note_title' => $this->note->title,
            'sharer_name' => $this->sharer->name,
            'message' => $this->sharer->name . ' shared a note with you: ' . $this->note->title,
        ];
    }
}
