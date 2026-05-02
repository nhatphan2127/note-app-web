<?php

namespace App\Http\Controllers;

use App\Models\Label;
use Illuminate\Http\Request;

class LabelController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->labels);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $label = $request->user()->labels()->create([
            'name' => $request->name,
        ]);

        return response()->json($label, 201);
    }

    public function update(Request $request, Label $label)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $label->update([
            'name' => $request->name,
        ]);

        return response()->json($label);
    }

    public function destroy($id)
    {
        $label = Label::find($id);
        if (!$label) {
            return response()->json(['message' => 'Already deleted or does not exist'], 200);
        }
        $label->delete();
        return response()->json(null, 204);
    }
}
