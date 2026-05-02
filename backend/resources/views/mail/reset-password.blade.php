<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>
    Your OTP for password reset is: <strong>{{ $otp }}</strong>. If you did not request a password reset, please ignore this email. 
    Otherwise, please click the link below to reset your password: <a href="{{ $resetLink }}">Reset Password</a>
</body>
</html>