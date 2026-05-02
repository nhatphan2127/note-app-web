<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserPreferenceController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $preferences = UserPreference::where('user_id', $user->id)->first();

        if (!$preferences) {
            return response()->json([
                'font_size' => 'medium',
                'theme' => 'light',
                'default_note_color' => '#ffffff'
            ]);
        }

        return response()->json($preferences);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'font_size' => 'sometimes|in:small,medium,large',
            'theme' => 'sometimes|in:light,dark',
            'default_note_color' => [
                'sometimes',
                'string',
                'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'
            ]
        ]);

        $preferences = UserPreference::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );


        return response()->json($preferences);
    }
}
