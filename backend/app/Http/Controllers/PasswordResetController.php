<?php

namespace App\Http\Controllers;

use App\Mail\ResetPassword;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class PasswordResetController extends Controller
{
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(60);
        
        $resetLink = env('FRONTEND_URL', 'http://localhost:5173') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token), 
                'otp' => Hash::make($otp),
                'created_at' => now()
            ]
        );

        Mail::to($user->email)->queue(new ResetPassword($otp, $resetLink));

        return response()->json(['message' => 'OTP and Reset link sent to your email']);
    }

    public function verifyReset(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'nullable|string',
            'otp' => 'nullable|string',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record) {
            return response()->json(['message' => 'No reset request found'], 422);
        }

        $isValid = false;
        if ($request->token && Hash::check($request->token, $record->token)) {
            $isValid = true;
        } elseif ($request->otp && Hash::check($request->otp, $record->otp)) {
            $isValid = true;
        }

        if (!$isValid) {
            return response()->json(['message' => 'Invalid or expired OTP/Link'], 422);
        }

        return response()->json(['message' => 'Verified successfully']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'nullable|string',
            'otp' => 'nullable|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record) {
            return response()->json(['message' => 'No reset request found'], 422);
        }

        $isValid = false;
        if ($request->token && Hash::check($request->token, $record->token)) {
            $isValid = true;
        } elseif ($request->otp && Hash::check($request->otp, $record->otp)) {
            $isValid = true;
        }

        if (!$isValid) {
            return response()->json(['message' => 'Invalid or expired OTP/Link'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->password = Hash::make($request->password);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successful']);
    }
}
