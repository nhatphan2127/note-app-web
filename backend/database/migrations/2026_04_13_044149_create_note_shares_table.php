<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('note_shares', function (Blueprint $テント) {
            $テント->id();
            $テント->foreignId('note_id')->constrained()->onDelete('cascade');
            $テント->foreignId('user_id')->constrained()->onDelete('cascade');
            $テント->enum('permission', ['read-only', 'edit'])->default('read-only');
            $テント->timestamp('shared_at')->useCurrent();
            $テント->timestamps();

            $テント->unique(['note_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('note_shares');
    }
};
