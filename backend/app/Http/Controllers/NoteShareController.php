<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\User;
use App\Notifications\NoteSharedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NoteShareController extends Controller
{
    public function index()
    {
        $sharedNotes = Auth::user()->sharedNotes()
            ->with(['user', 'labels', 'images'])
            ->latest('note_shares.created_at')
            ->get();

        return response()->json($sharedNotes);
    }

    public function share(Request $request, Note $note)
    {
        if ($note->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'emails' => 'required|array',
            'emails.*' => 'required|email|exists:users,email',
            'permission' => 'required|in:read-only,edit',
        ]);

        $sharedCount = 0;
        foreach ($request->emails as $email) {
            $userToShare = User::where('email', $email)->first();

            if ($userToShare->id === Auth::id()) {
                continue;
            }

            $note->sharedWith()->syncWithoutDetaching([
                $userToShare->id => [
                    'permission' => $request->permission,
                    'shared_at' => now(),
                ]
            ]);

            $userToShare->notify(new NoteSharedNotification($note, Auth::user()));
            $sharedCount++;
        }

        return response()->json(['message' => "Note shared successfully with $sharedCount recipients"]);
    }

    public function updatePermission(Request $request, Note $note, User $user)
    {
        if ($note->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'permission' => 'required|in:read-only,edit',
        ]);

        $note->sharedWith()->updateExistingPivot($user->id, [
            'permission' => $request->permission,
        ]);

        return response()->json(['message' => 'Permission updated successfully']);
    }

    public function revoke(Note $note, User $user)
    {
        if ($note->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->sharedWith()->detach($user->id);

        return response()->json(['message' => 'Access revoked successfully']);
    }

    public function getRecipients(Note $note)
    {
        if ($note->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($note->sharedWith()->get());
    }
}
