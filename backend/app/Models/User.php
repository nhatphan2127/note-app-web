<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'bio',
        'avatar',
        'password',
        'otp',
        'otp_expires_at',
        'preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'otp_expires_at' => 'datetime',
            'preferences' => 'array',
        ];
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function sharedNotes(): BelongsToMany
    {
        return $this->belongsToMany(Note::class, 'note_shares')
            ->withPivot('permission', 'shared_at')
            ->withTimestamps();
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function preference(): HasOne
    {
        return $this->hasOne(UserPreference::class);
    }
}
