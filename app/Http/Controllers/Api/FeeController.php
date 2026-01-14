<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fee;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException; 
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\AddressPayment; 
use Illuminate\Support\Facades\Auth;

class FeeController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:Ver-cuotas', ['only' => ['index', 'show']]);
        $this->middleware('permission:Crear-cuotas', ['only' => ['store']]);
        $this->middleware('permission:Editar-cuotas', ['only' => ['update']]);
        $this->middleware('permission:Eliminar-cuotas', ['only' => ['destroy']]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $fees = Fee::withTrashed()->get();
        
        return response()->json([
            'success' => true,
            'data' => $fees
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // UPDATED: Validation for the three specific amounts
            $validated = $request->validate([
                'name' => 'required|string|unique:fees,name|max:255',
                'amount_occupied' => 'required|numeric|min:0', // House Occupied
                'amount_empty'    => 'required|numeric|min:0', // House Empty
                'amount_land'     => 'required|numeric|min:0', // Land
                'description'     => 'nullable|string|max:500',
            ]);

            $fee = Fee::create($validated);
            
            return response()->json([
                'success' => true,
                'message' => 'Tarifa creada exitosamente',
                'data' => $fee
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fallo al crear la tarifa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $fee = Fee::withTrashed()->findOrFail($id); 
        return response()->json($fee);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Fee $fee)
    {
        try {
            if ($fee->deleted_at !== null) {
                 return response()->json([
                     'success' => false,
                     'message' => 'No se puede actualizar una tarifa dada de baja.' 
                 ], 403); 
            }
            
            // UPDATED: Validation for the three specific amounts on update
            $request->validate([
                'name' => 'required|string|max:255|unique:fees,name,' . $fee->id,
                'amount_occupied' => 'required|numeric|min:0',
                'amount_empty'    => 'required|numeric|min:0',
                'amount_land'     => 'required|numeric|min:0',
                'description'     => 'nullable|string|max:255',
            ]);
            
            // UPDATED: Direct assignment of the three fields
            $fee->name = $request->name;
            $fee->amount_occupied = $request->amount_occupied;
            $fee->amount_empty = $request->amount_empty;
            $fee->amount_land = $request->amount_land;
            $fee->description = $request->description;
            $fee->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Tarifa actualizada exitosamente', 
                'data' => $fee
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de Validación', 
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fallo al actualizar la tarifa', 
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Performs a SOFT DELETE.
     */
    public function destroy($id, Request $request) 
    {
        try {
            $fee = Fee::findOrFail($id);
            
            // Checks if there are any associated address payments before deleting
            if ($fee->addressPayments()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede dar de baja la tarifa porque hay pagos de predios asociados.'
                ], 409); 
            }

            $request->validate([
                'reason' => 'required|string|min:1|max:255',
            ]);
            
            $fee->deletion_reason = $request->reason;
            $fee->deleted_by_user_id = Auth::id(); 
            $fee->save(); 

            $fee->delete(); 

            return response()->json(['message' => 'Tarifa dada de baja exitosamente.'], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Tarifa no encontrada.'], 404);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Motivo de baja requerido y debe ser válido.'], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Fallo al dar de baja la tarifa.'], 500);
        }
    }

    /**
     * Returns the view for the fees index.
     */
    public function redire2()
    {
        return view('fees.index');
    }
}