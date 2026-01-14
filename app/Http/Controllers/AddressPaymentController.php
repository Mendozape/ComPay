<?php

namespace App\Http\Controllers;

use App\Models\AddressPayment;
use App\Models\Address;
use App\Models\Fee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class AddressPaymentController extends Controller
{
    /**
     * Set up middleware for permissions based on roles.
     */
    public function __construct()
    {
        $this->middleware('permission:Ver-pagos', ['only' => ['index', 'show', 'paymentHistory']]);
        $this->middleware('permission:Crear-pagos', ['only' => ['store']]);
        $this->middleware('permission:Editar-pagos', ['only' => ['update']]);
        $this->middleware('permission:Eliminar-pagos', ['only' => ['destroy', 'cancelPayment']]);

        // Shared access for both Admin (during payment) and Resident (for statement)
        $this->middleware('permission:Ver-pagos|Ver-estado-cuenta', ['only' => ['getPaidMonths']]);
    }

    /**
     * Display a listing of all payments with address and fee details.
     */
    public function index()
    {
        return response()->json(AddressPayment::with(['address.street', 'fee'])->get());
    }

    /**
     * Store multiple payment records (one per month).
     * Updated logic to handle: House (Occupied/Empty) and Land amounts.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'address_id'    => 'required|exists:addresses,id',
            'fee_id'        => 'required|exists:fees,id',
            'payment_date'  => 'required|date',
            'year'          => 'required|digits:4',
            'months'        => 'required|array',
            'months.*'      => 'integer|min:1|max:12',
            'waived_months' => 'nullable|array',
        ]);

        $fee = Fee::findOrFail($validated['fee_id']);
        $address = Address::findOrFail($validated['address_id']);

        // Check for existing active payments to prevent duplicates
        $existingPayments = AddressPayment::where('address_id', $validated['address_id'])
            ->where('fee_id', $validated['fee_id'])
            ->where('year', $validated['year'])
            ->whereIn('month', $validated['months'])
            ->whereNull('deleted_at')
            ->pluck('month')->toArray();

        $newMonths = array_diff($validated['months'], $existingPayments);
        if (empty($newMonths)) {
            return response()->json(['message' => 'Selected months are already registered.'], 200);
        }

        /** * 🔥 DYNAMIC 3-TIER AMOUNT CALCULATION
         * Evaluates Property Type (CASA/TERRENO) and Status (Habitada/Deshabitada)
         */
        $propertyType = trim(strtoupper($address->type));
        $propertyStatus = trim($address->status); // Expected: 'Habitada' or 'Deshabitada'
        $baseAmount = 0;

        if ($propertyType === 'TERRENO') {
            $baseAmount = $fee->amount_land;
        } else {
            // Logic for CASA (House): Check if it is occupied or empty
            $baseAmount = ($propertyStatus === 'Habitada') 
                ? $fee->amount_occupied 
                : $fee->amount_empty;
        }

        // Fallback safety: ensure amount is not null
        if (is_null($baseAmount)) {
            $baseAmount = 0;
        }

        $monthsToWaive = $validated['waived_months'] ?? [];
        $payments = [];

        foreach ($newMonths as $month) {
            $isWaived = in_array($month, $monthsToWaive);
            $payments[] = AddressPayment::create([
                'address_id'   => $validated['address_id'],
                'fee_id'       => $validated['fee_id'],
                'payment_date' => $validated['payment_date'],
                'month'        => $month,
                'year'         => $validated['year'],
                'status'       => $isWaived ? 'Condonado' : 'Pagado',
                'amount_paid'  => $isWaived ? 0 : $baseAmount,
            ]);
        }

        return response()->json(['message' => 'Payment registered successfully.', 'saved' => $payments], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        return response()->json(AddressPayment::with(['address.street', 'fee'])->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $addressPayment = AddressPayment::findOrFail($id);
        if ($addressPayment->status === 'Cancelado' || $addressPayment->trashed()) {
            return response()->json(['message' => 'Cannot modify a canceled payment.'], 403);
        }

        $addressPayment->update($request->only(['payment_date', 'amount_paid', 'status']));
        return response()->json($addressPayment);
    }

    /**
     * Performs a SOFT DELETE audit.
     */
    public function destroy($id)
    {
        return response()->json(['message' => 'Please use the Cancel Payment function to provide a reason.'], 403);
    }

    /**
     * Retrieve payment history for a specific property.
     */
    public function paymentHistory($addressId)
    {
        try {
            Address::findOrFail($addressId);
            $payments = AddressPayment::where('address_id', $addressId)
                ->withTrashed()
                ->with(['fee' => fn($q) => $q->withTrashed()])
                ->orderBy('year', 'desc')
                ->orderBy('month', 'asc')
                ->get();

            return response()->json(['success' => true, 'data' => $payments]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Address not found.'], 404);
        }
    }

    /**
     * Soft delete a payment with a required cancellation reason.
     */
    public function cancelPayment($paymentId, Request $request)
    {
        try {
            $payment = AddressPayment::findOrFail($paymentId);
            $request->validate(['reason' => 'required|string|min:2|max:500']);

            if ($payment->deleted_at !== null) {
                return response()->json(['success' => false, 'message' => 'Payment is already canceled.'], 400);
            }

            $payment->status = 'Cancelado';
            $payment->deletion_reason = $request->reason;
            $payment->deleted_by_user_id = Auth::id();
            $payment->save();
            $payment->delete();

            return response()->json(['success' => true, 'message' => 'Cancellation successful.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a summary of paid months for a specific address and year.
     */
    public function getPaidMonths($addressId, $year, Request $request)
    {
        try {
            $query = AddressPayment::where('address_id', $addressId)
                ->where('year', $year)
                ->whereIn('status', ['Pagado', 'Condonado'])
                ->whereNull('deleted_at')
                ->with(['fee:id,name']);

            if ($request->has('fee_id') && !empty($request->fee_id)) {
                $query->where('fee_id', $request->fee_id);
            }

            $payments = $query->get(['id', 'month', 'status', 'payment_date', 'fee_id', 'amount_paid']);

            $formattedMonths = $payments->map(function ($p) {
                return [
                    'month' => $p->month,
                    'status' => $p->status,
                    'payment_date' => $p->payment_date,
                    'fee_name' => $p->fee ? $p->fee->name : 'General',
                    'amount_paid' => $p->amount_paid 
                ];
            });

            return response()->json([
                'success' => true,
                'months' => $formattedMonths
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}