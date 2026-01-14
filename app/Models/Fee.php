<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\AddressPayment; 

class Fee extends Model
{
    use HasFactory, SoftDeletes; 
    
    protected $fillable = [
        'name',
        'amount_occupied', 
        'amount_empty',    
        'amount_land',     
        'description',
        'active',
        'deletion_reason',
        'deleted_by_user_id',
    ];

    public function addressPayments()
    {
        return $this->hasMany(AddressPayment::class);
    }
    
    public function deleter()
    {
        return $this->belongsTo(\App\Models\User::class, 'deleted_by_user_id');
    }

    /**
     * Helper to get amount based on property status/type.
     * Use this in your Payment logic.
     */
    public function getAmountByPropertyStatus(string $type, string $status)
    {
        if ($type === 'TERRENO') {
            return $this->amount_land;
        }
        
        return ($status === 'Habitada') ? $this->amount_occupied : $this->amount_empty;
    }
}