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
        Schema::create('notes', function (Blueprint $label) {
            $label->id();
            $label->foreignId('user_id')->constrained()->onDelete('cascade');
            $label->string('title')->nullable();
            $label->text('content')->nullable();
            $label->boolean('is_pinned')->default(false);
            $label->timestamp('pinned_at')->nullable();
            $label->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
