<?php

namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $passwordHash = Hash::make('123456');
        User::create([
            'name' => 'Administrador',
            'email' => 'admin@gmail.com',
            'email_verified_at' => now(),
            'password' => $passwordHash,
            'remember_token' => Str::random(10),
        ])->assignRole('Admin');
        
        /*User::create([
            'name' => 'Maximiliano Mendoza Alvarado',
            'email' => 'erasto.mendoza.perez@gmail.com',
            'email_verified_at' => now(),
            'password' => $passwordHash,
            'remember_token' => Str::random(10),
        ])->assignRole('Presidente');*/

    }
}
