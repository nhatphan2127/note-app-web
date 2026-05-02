<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('note.{id}', function ($user, $id) {
    $note = \App\Models\Note::find($id);
    if (!$note) return false;

    $canAccess = $note->user_id === $user->id || 
                 $note->sharedWith()->where('user_id', $user->id)->exists();

    if ($canAccess) {
        return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar];
    }

    return false;
});
