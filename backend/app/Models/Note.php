<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'is_pinned',
        'pinned_at',
        'password',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'pinned_at' => 'datetime',
        'password' => 'hashed',
    ];

    protected $hidden = [
        'password',
    ];

    protected $appends = [
        'is_locked',
        'is_shared',
    ];

    public function getIsSharedAttribute(): bool
    {
        return $this->sharedWith()->exists();
    }

    public function getIsLockedAttribute(): bool
    {
        return !is_null($this->password);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sharedWith(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'note_shares')
            ->withPivot('permission', 'shared_at')
            ->withTimestamps();
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'note_label');
    }

    public function images(): HasMany
    {
        return $this->hasMany(NoteImage::class);
    }
}
