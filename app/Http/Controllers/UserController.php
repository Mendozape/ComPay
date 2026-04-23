<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:Ver-usuarios', ['only' => ['index', 'show', 'count']]);
        $this->middleware('permission:Crear-usuarios', ['only' => ['store']]);
        $this->middleware('permission:Editar-usuarios', ['only' => ['update', 'restore']]);
        $this->middleware('permission:Eliminar-usuarios', ['only' => ['destroy']]);
    }

    public function index(Request $request)
    {
        try {
            // Load users including soft deleted ones with roles and addresses relationships
            $query = User::withTrashed()->with(['roles', 'addresses']);

            // Check if a search query is provided
            if ($request->filled('search')) {
                $search = trim($request->query('search'));

                if (mb_strlen($search) >= 1) {
                    $query->where(function ($q) use ($search) {
                        /**
                         * We use COLLATE utf8mb4_general_ci to allow Case-Insensitive search.
                         * 'ci' stands for Case Insensitive, which allows matching 'Erasto' 
                         * even if the user searches for 'erasto' or 'ERASTO'.
                         */
                        $q->where(DB::raw("name COLLATE utf8mb4_general_ci"), 'LIKE', "%{$search}%")
                            ->orWhere(DB::raw("email COLLATE utf8mb4_general_ci"), 'LIKE', "%{$search}%");
                    });
                }
            } elseif ($request->has('search')) {
                // Return empty result if search key exists but is empty
                return response()->json(['data' => [], 'total' => 0]);
            }

            // Set pagination: 50 items for searches, 10 for default view
            $perPage = $request->filled('search') ? 50 : 10;
            $usuarios = $query->paginate($perPage);

            // Transform the collection to include specific calculated fields and permissions
            $usuarios->getCollection()->transform(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'comments' => $user->comments,
                    'roles' => $user->roles,
                    'permissions' => $user->getAllPermissions(),
                    'addresses' => $user->addresses,
                    'address' => $user->addresses->first(),
                    'deleted_at' => $user->deleted_at,
                ];
            });

            return response()->json($usuarios);
        } catch (\Exception $e) {
            // Log the error and return a 500 response in case of failure
            \Log::error("User Index Error: " . $e->getMessage());
            return response()->json(['error' => 'Internal Server Error', 'message' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            // 🟢 FIX: Changed 'address' to 'addresses' to avoid the 500 error when loading the edit form
            $user = User::withTrashed()->with(['roles', 'addresses'])->findOrFail($id);

            // Add a virtual property for frontend compatibility if needed
            $user->address = $user->addresses->first();
            $user->all_permissions = $user->getAllPermissions();

            return response()->json($user);
        } catch (\Exception $e) {
            // This is what was causing your "Error al cargar los datos" message
            \Log::error("User Show Error: " . $e->getMessage());
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|confirmed|min:6',
            'roles' => 'required|array|min:1',
        ]);

        $input = $request->all();
        $input['email'] = strtolower($input['email']);
        $input['password'] = Hash::make($input['password']);

        $user = User::create($input);
        $user->assignRole($request->input('roles'));

        return response()->json(['message' => 'Usuario creado correctamente', 'user' => $user], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'roles' => 'required|array|min:1',
        ]);

        try {
            DB::beginTransaction(); // Start transaction to ensure data integrity

            $user = User::withTrashed()->findOrFail($id);

            $data = $request->only(['name', 'email', 'phone', 'comments']);
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $user->update($data);

            // 🔥 FIX: Convert all elements in 'roles' array to Integers
            if ($request->has('roles')) {
                $roleIds = collect($request->input('roles'))
                    ->map(fn($val) => (int)$val)
                    ->filter(fn($val) => $val > 0)
                    ->toArray();

                // Using syncRoles with IDs explicitly
                $user->syncRoles($roleIds);
            }

            DB::commit();

            return response()->json([
                'message' => 'Usuario actualizado correctamente',
                'user' => $user->load('roles')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            // This will log the EXACT error in storage/logs/laravel.log
            \Log::error("USER_UPDATE_FAILED: " . $e->getMessage());

            return response()->json([
                'error' => 'Error en el servidor',
                'details' => $e->getMessage() // This will help us see the error in React
            ], 500);
        }
    }

    public function restore($id)
    {
        try {
            $user = User::withTrashed()->findOrFail($id);
            $user->restore();
            return response()->json(['message' => 'Usuario reactivado correctamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'No se pudo reactivar al usuario'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);

            // 🟢 FIX: Use 'addresses' and check if the collection is not empty
            if ($user->addresses()->exists()) {
                return response()->json(['error' => 'El usuario tiene uno o más predios asignados.'], 400);
            }

            $user->delete();
            return response()->json(['message' => 'Usuario desactivado']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error al eliminar'], 500);
        }
    }

    public function count()
    {
        return response()->json([
            'userCount' => User::count(),
            'roleCount' => Role::count(),
        ]);
    }
}
