<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\NoteImage;
use App\Events\NoteUpdated;
use GuzzleHttp\Psr7\Query;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = $user->notes()->with(['labels', 'images']);

        if ($request->has('label_ids')) {
            $labelIds = is_array($request->label_ids) ? $request->label_ids : explode(',', $request->label_ids);
            foreach ($labelIds as $labelId) {
                $query->whereHas('labels', function ($q) use ($labelId) {
                    $q->where('labels.id', $labelId);
                });
            }
        }

        if ($request->has('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $notes = $query->orderBy('is_pinned', 'desc')
            ->orderBy('pinned_at', 'desc')
            ->orderBy('updated_at', 'desc')
            ->get();
        
        return response()->json($notes);
        
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string',
            'content' => 'nullable|string',
            'color' => 'nullable|string',
            'label_ids' => 'nullable|array',
            'label_ids.*' => 'exists:labels,id',
        ]);

        $user = $request->user();
        $defaultColor = '#ffffff';
        
        $preferences = \App\Models\UserPreference::where('user_id', $user->id)->first();
        if ($preferences && $preferences->default_note_color) {
            $defaultColor = $preferences->default_note_color;
        }

        $note = $user->notes()->create([
            'title' => $request->title,
            'content' => $request->content,
            'color' => $request->color ?? $defaultColor,
        ]);

        if ($request->has('label_ids')) {
            $note->labels()->sync($request->label_ids);
        }

        return response()->json($note->load(['labels', 'images']), 201);
    }

    public function show(Note $note)
    {
        return response()->json($note->load(['labels', 'images']));
    }

    public function update(Request $request, Note $note)
    {
        // Check permissions
        $isOwner = $note->user_id === $request->user()->id;
        $sharedPivot = $note->sharedWith()->where('user_id', $request->user()->id)->first()?->pivot;
        $canEdit = $isOwner || ($sharedPivot && $sharedPivot->permission === 'edit');

        if (!$canEdit) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'nullable|string',
            'content' => 'nullable|string',
            'is_pinned' => 'nullable|boolean',
            'color' => 'nullable|string',
            'label_ids' => 'nullable|array',
            'label_ids.*' => 'exists:labels,id',
        ]);

        $data = $request->only(['title', 'content', 'is_pinned', 'color']);

        if ($request->has('is_pinned') && $request->is_pinned != $note->is_pinned) {
            $data['pinned_at'] = $request->is_pinned ? now() : null;
        }

        $note->update($data);

        if ($request->has('label_ids')) {
            $note->labels()->sync($request->label_ids);
        }

        broadcast(new NoteUpdated($note, $request->user()->id))->toOthers();

        return response()->json($note->load(['labels', 'images']));
    }

    public function destroy($id)
    {
        $note = Note::find($id);
        if (!$note) {
            return response()->json(['message' => 'Already deleted or does not exist'], 200); // Trả về 200 thay vì 404
        }
        $note->delete();
        return response()->json(null, 204);
    }

    public function uploadImages(Request $request, Note $note)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:2048', // Allow only jpeg, png, jpg and max 2MB
        ], [
            'images.*.mimes' => 'Only JPEG and PNG images are allowed.',
            'images.*.max' => 'Each image must not exceed 2MB.',
            'images.*.image' => 'The uploaded file must be an image.',
        ]);

        $uploadedImages = [];
        
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('note_images', 'public');
                
                $noteImage = $note->images()->create(['image_path' => $path]);
                $uploadedImages[] = $noteImage;
            }
        }

        return response()->json($uploadedImages);
    }

    public function deleteImage(NoteImage $image)
    {
        Storage::disk('public')->delete($image->image_path);
        $image->delete();
        return response()->json(null, 204);
    }

    public function setPassword(Request $request, Note $note)
    {
        $rules = [
            'password' => 'required|string|min:4|confirmed',
        ];

        // If note is already locked, require current password
        if ($note->is_locked) {
            $rules['current_password'] = 'required|string';
        }

        $request->validate($rules);

        if ($note->is_locked && !Hash::check($request->current_password, $note->password)) {
            return response()->json(['message' => 'Current password incorrect'], 422);
        }

        $note->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password set successfully']);
    }

    public function removePassword(Request $request, Note $note)
    {
        $request->validate([
            'current_password' => 'required|string',
        ]);

        if (!Hash::check($request->current_password, $note->password)) {
            return response()->json(['message' => 'Current password incorrect'], 422);
        }

        $note->update([
            'password' => null,
        ]);

        return response()->json(['message' => 'Password removed successfully']);
    }

    public function verifyPassword(Request $request, Note $note)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        if (Hash::check($request->password, $note->password)) {
            return response()->json(['message' => 'Password verified successfully']);
        }

        return response()->json(['message' => 'Invalid password'], 401);
    }

    public function resetPasswordWithAccount(Request $request, Note $note)
    {
        $request->validate([
            'account_password' => 'required|string',
            'new_note_password' => 'required|string|min:4|confirmed',
        ]);

        $user = $request->user();

        // Verify account password
        if (!Hash::check($request->account_password, $user->password)) {
            return response()->json(['message' => 'Account password incorrect'], 422);
        }

        // Only owner can reset password via account
        if ($note->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->update([
            'password' => Hash::make($request->new_note_password),
        ]);

        return response()->json(['message' => 'Note password reset successfully']);
    }
}
