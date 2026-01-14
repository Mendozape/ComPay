<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany; 
use App\Models\User;

class Address extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'addresses';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',       
        'street_id',
        'type',
        'status',       
        'street_number',
        'community',
        'comments',
        'months_overdue',
    ];

    protected $casts = [
        'months_overdue' => 'integer',
    ];

    /**
     * Relationship with the User (Resident).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    /**
     * Relationship with the Street catalog.
     */
    public function street(): BelongsTo
    {
        return $this->belongsTo(Street::class, 'street_id');
    }
    
    /**
     * Relationship with AddressPayment.
     * UPDATED: Using the naming convention for AddressPayments
     */
    public function addressPayments(): HasMany 
    {
        return $this->hasMany(AddressPayment::class, 'address_id');
    }

    // Alias to maintain compatibility with existing code if needed
    public function payments(): HasMany 
    {
        return $this->addressPayments();
    }
}