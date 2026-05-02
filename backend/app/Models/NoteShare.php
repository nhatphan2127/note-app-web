<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'note_id',
        'user_id',
        'permission',
        'shared_at',
    ];

    protected $casts = [
        'shared_at' => 'datetime',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
