<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Street;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AddressController extends Controller
{
    /**
     * Set up middleware for permissions.
     */
    public function __construct()
    {
        $this->middleware('permission:Ver-predios', ['only' => ['index', 'show', 'listActive']]);
        $this->middleware('permission:Crear-predios', ['only' => ['store']]);
        $this->middleware('permission:Editar-predios', ['only' => ['update']]);
        $this->middleware('permission:Eliminar-predios', ['only' => ['destroy']]);
    }

    /**
     * Display a listing of all addresses including trashed ones.
     */
    public function index()
    {
        // Updated relationship to 'user' instead of 'resident'
        $addresses = Address::withTrashed()->with(['user', 'street'])->get();
        return response()->json(['data' => $addresses]);
    }

    /**
     * List only active addresses (not deleted).
     */
    public function listActive()
    {
        $addresses = Address::with(['user', 'street'])->get();
        return response()->json(['data' => $addresses]);
    }

    /**
     * Store a newly created address in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer|exists:users,id',
            'street_id' => 'required|integer|exists:streets,id',
            'community' => 'required|string|max:255',
            'street_number' => [
                'required',
                'string',
                'max:255',
                'numeric',
                Rule::unique('addresses')->where(function ($query) use ($request) {
                    return $query->where('community', $request->community)
                        ->where('street_id', $request->street_id)
                        ->where('street_number', $request->street_number)
                        ->whereNull('deleted_at');
                }),
            ],
            'type' => 'required|string|in:CASA,TERRENO',
            // 🟢 ADDED: Status validation for Occupied/Empty logic
            'status' => 'required|string|in:Habitada,Deshabitada',
            'comments' => 'nullable|string',
            'months_overdue' => 'required|integer|min:0', 
        ], [
            'street_number.unique' => 'La combinación de Comunidad, Calle y Número ya existe.',
            'street_number.numeric' => 'El número de calle debe contener solo dígitos.',
            'user_id.required' => 'Debe seleccionar un usuario para asignar la dirección.',
            'user_id.exists' => 'El usuario seleccionado no es válido.',
            'street_id.required' => 'Debe seleccionar una calle válida.',
            'months_overdue.required' => 'El número de meses atrasados es obligatorio.',
            'status.in' => 'El estado debe ser Habitada o Deshabitada.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de Validación: ' . $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Mass assignment: ensures 'status' is included in the create process
            $address = Address::create($request->all());
            return response()->json(['message' => 'Dirección creada exitosamente.', 'data' => $address], 201);
            
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al procesar la solicitud: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified address.
     */
    public function show(Address $address)
    {
        return response()->json(['data' => $address->load(['street', 'user'])]);
    }

    /**
     * Update the specified address in storage.
     */
    public function update(Request $request, Address $address)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer|exists:users,id',
            'street_id' => 'required|integer|exists:streets,id',
            'community' => 'required|string|max:255',
            'street_number' => [
                'required',
                'string',
                'max:255',
                'numeric',
                Rule::unique('addresses')->ignore($address->id)->where(function ($query) use ($request) {
                    return $query->where('community', $request->community)
                        ->where('street_id', $request->street_id)
                        ->where('street_number', $request->street_number)
                        ->whereNull('deleted_at');
                }),
            ],
            'type' => 'required|string|in:CASA,TERRENO',
            'status' => 'required|string|in:Habitada,Deshabitada',
            'months_overdue' => 'required|integer|min:0',
        ], [
            'user_id.required' => 'Debe seleccionar un usuario.',
            'street_id.required' => 'Debe seleccionar una calle.',
            'status.in' => 'El estado debe ser Habitada o Deshabitada.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de Validación: ' . $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        $address->update($request->all());
        return response()->json(['message' => 'Dirección actualizada exitosamente.', 'data' => $address], 200);
    }

    /**
     * Remove the specified address (Soft Delete).
     */
    public function destroy(Request $request, Address $address)
    {
        $request->validate(['reason' => 'required|string|min:5']);
        
        // Checks for active payments using the addressPayments relationship (saved in memory)
        $activePaymentsCount = $address->addressPayments()->whereNull('deleted_at')->count();

        if ($activePaymentsCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede dar de baja esta dirección porque tiene pagos ACTIVOS.'
            ], 409);
        }

        $address->delete();
        return response()->json(['message' => 'Dirección dada de baja exitosamente.'], 200);
    }
}