<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\AddressPayment;
use App\Models\Expense;
use App\Models\Fee; // Ensure this is imported
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:reportes', ['only' => ['debtors', 'expenses']]);
    }
    
    /**
     * Income Report (Debtors / Adeudos)
     * Mobile-optimized to return owner names and monthly status grid.
     */
    public function debtors(Request $request)
    {
        $paymentType = $request->get('payment_type', null);
        $year = (int) $request->get('year', date('Y'));

        try {
            // 1. Get filtered fees
            $fees = [];
            if ($paymentType === 'Todos') {
                $fees = Fee::all();
            } elseif ($paymentType) {
                $fee = Fee::where('name', $paymentType)->first();
                if ($fee) $fees = [$fee];
            }

            // 2. Fetch addresses with relationships
            // ⭐ CRITICAL: user_id must be in the select for the 'user' relationship to work
            $addresses = Address::select('id', 'street_id', 'street_number', 'type', 'comments', 'months_overdue', 'user_id')
                ->with(['street', 'user']) 
                ->get();

            $allRows = collect();

            foreach ($fees as $fee) {
                $feeAmount = $fee->amount ?? 0;
                $feeName   = $fee->name ?? '';

                $rows = $addresses->map(function ($address) use ($year, $feeName, $feeAmount) {

                    $streetName = $address->street->name ?? 'CALLE NO ASIGNADA'; 
                    $fullAddress = "{$streetName} #{$address->street_number} ({$address->type})";
                    
                    // Get owner name from relationship defined in your model
                    $ownerName = $address->user->name ?? 'SIN DUEÑO ASIGNADO';

                    // Query for monthly checkmarks (X or Check)
                    $monthlyStatusPayments = AddressPayment::where('address_id', $address->id)
                        ->whereIn('status', ['Pagado', 'Condonado']) 
                        ->where('year', $year)
                        ->when($feeName, function($q) use ($feeName) {
                            $q->whereHas('fee', fn($inner) => $inner->where('name', $feeName));
                        })
                        ->get();

                    // Query for income totals (Total Row)
                    $calendarPayments = AddressPayment::where('address_id', $address->id)
                        ->whereIn('status', ['Pagado', 'Condonado']) 
                        ->whereYear('payment_date', $year)
                        ->when($feeName, function($q) use ($feeName) {
                            $q->whereHas('fee', fn($inner) => $inner->where('name', $feeName));
                        })
                        ->get();

                    $paidMonthsArray = $monthlyStatusPayments->pluck('month')->toArray();
                    $paymentDates = [];
                    $paidAmounts  = [];
                    $monthStatuses = []; 

                    foreach ($monthlyStatusPayments as $payment) {
                        $paymentDates[$payment->month] = $payment->payment_date;
                        $paidAmounts[$payment->month]  = $payment->amount_paid ?? 0;
                        $monthStatuses[$payment->month] = $payment->status; 
                    }

                    $incomeByCalendarMonth = array_fill(1, 12, 0);
                    foreach ($calendarPayments as $payment) {
                        $pMonth = Carbon::parse($payment->payment_date)->month;
                        $incomeByCalendarMonth[$pMonth] += $payment->amount_paid ?? 0;
                    }

                    $monthData = [];
                    for ($m = 1; $m <= 12; $m++) {
                        $isRegistered = in_array($m, $paidMonthsArray);
                        $monthData["month_{$m}"] = $isRegistered;
                        $monthData["month_{$m}_date"] = $isRegistered ? ($paymentDates[$m] ?? null) : null;
                        $monthData["month_{$m}_amount_paid"] = $isRegistered ? ($paidAmounts[$m] ?? 0) : null;
                        $monthData["month_{$m}_status"] = $isRegistered ? ($monthStatuses[$m] ?? 'Pagado') : null; 
                        $monthData["total_paid_in_month_{$m}"] = $incomeByCalendarMonth[$m]; 
                    }

                    return array_merge([
                        'name' => $fullAddress,
                        'full_address' => $fullAddress,
                        'owner_name' => $ownerName, 
                        'paid_months' => count($paidMonthsArray),
                        'fee_amount' => $feeAmount,
                        'fee_name' => $feeName,
                        'months_overdue' => $address->months_overdue ?? 0, 
                        'total' => 0, 
                        'comments' => $address->comments ?? '',
                    ], $monthData);
                });

                $allRows = $allRows->merge($rows);
            }

            $allRows = $allRows->values()->sortBy(['fee_name', 'name'])->values();

            return response()->json([
                'success' => true,
                'data' => $allRows,
                'total' => $allRows->sum('total')
            ]);
        } catch (\Exception $e) {
            \Log::error('Debtors Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Expense Report (Egresos)
     */
    public function expenses(Request $request)
    {
        $year = (int) $request->get('year', now()->year);
        $month = (int) $request->get('month', now()->month);

        if ($month < 1 || $month > 12) $month = now()->month;

        $expenses = Expense::with('category')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->get();

        $dateForName = Carbon::createFromDate($year, $month, 1)->locale('es');

        return response()->json([
            'month' => $month,
            'year' => $year,
            'month_name' => $dateForName->monthName,
            'expenses' => $expenses,
            'total' => $expenses->sum('amount'),
        ]);
    }
}