<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Log;

class PermisosController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:Ver-permisos', ['only' => ['index', 'show']]);
        $this->middleware('permission:Crear-permisos', ['only' => ['store']]);
        $this->middleware('permission:Editar-permisos', ['only' => ['update']]);
        $this->middleware('permission:Eliminar-permisos', ['only' => ['destroy']]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // 🛡️ Security: Only return necessary fields for the list
        $permisos = Permission::all(['id', 'name']); 
        return response()->json($permisos);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $permiso = Permission::find($id);

        if (!$permiso) {
            return response()->json(['message' => 'Permiso no encontrado'], 404);
        }

        // 🛡️ Security: Return only 'id' and 'name' to the frontend
        return response()->json($permiso->only(['id', 'name']));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
        ]);

        try {
            $permiso = Permission::create([
                'name' => $request->input('name'),
                'guard_name' => 'web',
            ]);

            // Clear Spatie cache
            app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            return response()->json([
                'message' => 'Permiso creado correctamente.',
                'permiso' => $permiso->only(['id', 'name']) // 🛡️ Controlled output
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating permission: ' . $e->getMessage());
            return response()->json([
                'message' => 'Fallo al crear el permiso.',
                // Do not return $e->getMessage() in production for security
                'error' => config('app.debug') ? $e->getMessage() : 'Internal Server Error'
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,' . $id,
        ]);
        
        try {
            $permiso = Permission::findOrFail($id);
            
            // 🛡️ Explicitly update only the name to prevent injection of other fields
            $permiso->update(['name' => $validated['name']]);

            // Clear Spatie cache
            app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            return response()->json([
                'message' => 'El permiso ha sido actualizado con éxito.',
                'permiso' => $permiso->only(['id', 'name']) // 🛡️ Controlled output
            ]);
        } catch (\Exception $e) {
             Log::error('Error updating permission: ' . $e->getMessage());
             return response()->json([
                'message' => 'Fallo al actualizar el permiso.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal Server Error'
             ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            Permission::destroy($id);
            
            // Clear Spatie cache
            app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
            
            return response()->json(['message' => 'El permiso ha sido eliminado con éxito.']);
        } catch (\Exception $e) {
             Log::error('Error deleting permission: ' . $e->getMessage());
             return response()->json([
                'message' => 'Fallo al eliminar el permiso.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal Server Error'
             ], 500);
        }
    }
}