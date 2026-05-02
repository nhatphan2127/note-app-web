<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'note_id',
        'image_path',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
