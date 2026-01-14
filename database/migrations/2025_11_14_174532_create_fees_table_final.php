<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('fees', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            
            // --- UPDATED AMOUNT FIELDS ---
            $table->decimal('amount_occupied', 10, 2)->default(0.00); // inhabited house
            $table->decimal('amount_empty', 10, 2)->default(0.00);    // uninhabited house
            $table->decimal('amount_land', 10, 2)->default(0.00);     // land
            
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->softDeletes();
            $table->text('deletion_reason')->nullable(); 

            $table->foreignId('deleted_by_user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('fees');
    }
};