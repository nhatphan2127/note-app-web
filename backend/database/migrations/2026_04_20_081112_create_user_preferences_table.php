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
        Schema::create('user_preferences', function (Blueprint $col) {
            $col->id();
            $col->foreignId('user_id')->constrained()->onDelete('cascade');
            $col->enum('font_size', ['small', 'medium', 'large'])->default('medium');
            $col->enum('theme', ['light', 'dark'])->default('light');
            $col->string('default_note_color')->default('#ffffff');
            $col->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
