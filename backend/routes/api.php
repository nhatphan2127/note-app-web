<?php

use App\Http\Controllers\Api\UserPreferenceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NoteShareController;
use App\Http\Controllers\PasswordResetController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
Route::post('/verify-reset', [PasswordResetController::class, 'verifyReset']);
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verify'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/notifications', function (\Illuminate\Http\Request $request) {
        return $request->user()->unreadNotifications;
    });

    Route::post('/notifications/mark-as-read', function (\Illuminate\Http\Request $request) {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'Notifications marked as read']);
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/avatar', [AuthController::class, 'updateAvatar']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::get('/preferences', [UserPreferenceController::class, 'index']);
    Route::put('/preferences', [UserPreferenceController::class, 'update']);

    Route::apiResource('notes', NoteController::class);
    Route::post('notes/{note}/verify-password', [NoteController::class, 'verifyPassword']);
    Route::post('notes/{note}/reset-password', [NoteController::class, 'resetPasswordWithAccount']);
    Route::post('notes/{note}/password', [NoteController::class, 'setPassword']);
    Route::post('notes/{note}/remove-password', [NoteController::class, 'removePassword']);
    Route::post('notes/{note}/images', [NoteController::class, 'uploadImages']);
    Route::delete('note-images/{image}', [NoteController::class, 'deleteImage']);

    Route::apiResource('labels', LabelController::class);

    Route::get('/shared-notes', [NoteShareController::class, 'index']);
    Route::get('/notes/{note}/share', [NoteShareController::class, 'getRecipients']);
    Route::post('/notes/{note}/share', [NoteShareController::class, 'share']);
    Route::patch('/notes/{note}/share/{user}', [NoteShareController::class, 'updatePermission']);
    Route::delete('/notes/{note}/share/{user}', [NoteShareController::class, 'revoke']);
});
