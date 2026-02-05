<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RolesController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\AddressPaymentController;
use App\Http\Controllers\PermisosController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\StreetController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use Illuminate\Support\Facades\Session;
use App\Http\Controllers\ProfileController;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast; // Required for Broadcast::auth

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/login', [ApiController::class, 'login']);

// Protected Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {

    // --- USER DATA ---
    Route::get('/user', function (Request $request) {
        return response()->json(
            User::with([
                'addresses.street',
                'roles.permissions',
                'permissions'
            ])->findOrFail($request->user()->id)
        );
    });

    Route::get('/get-token', function (Request $request) {
        return response()->json([
            'token' => Session::get('api_token'),
            'user' => $request->user(),
        ]);
    });

    // --- PROFILE & USERS ---
    Route::post('/profile/update', [ProfileController::class, 'updateProfile']);
    Route::get('/users', [ApiController::class, 'users']);
    Route::get('/users/count', [UserController::class, 'count']);
    Route::get('/roles/count', [RolesController::class, 'count']);

    // --- CATALOGS (Streets, Addresses, Fees) ---
    Route::apiResource('/fees', FeeController::class);
    Route::apiResource('/streets', StreetController::class);
    Route::get('/addresses/active', [AddressController::class, 'listActive']);
    Route::apiResource('/addresses', AddressController::class);

    // --- PAYMENTS (AddressPayment) ---
    Route::get('/address_payments/paid-months/{addressId}/{year}', [AddressPaymentController::class, 'getPaidMonths']);
    Route::get('/address_payments/history/{addressId}', [AddressPaymentController::class, 'paymentHistory']);
    Route::post('/address_payments/cancel/{paymentId}', [AddressPaymentController::class, 'cancelPayment']);
    Route::apiResource('/address_payments', AddressPaymentController::class);

    // --- ADMINISTRATIVE (Permissions, Roles, Users) ---
    Route::apiResource('permisos', PermisosController::class);
    Route::apiResource('roles', RolesController::class);
    Route::post('/usuarios/restore/{id}', [UserController::class, 'restore']);
    Route::apiResource('usuarios', UserController::class);

    // --- REPORTS ---
    Route::get('reports/debtors', [ReportController::class, 'debtors']);
    Route::get('reports/payments-by-address', [ReportController::class, 'paymentsByAddressId']);
    Route::get('reports/income-by-month', [ReportController::class, 'incomeByMonth']);
    Route::get('/reports/available-years', [ReportController::class, 'paymentYears']);
    Route::get('reports/expenses', [ReportController::class, 'expenses']);

    // --- EXPENSES MODULE ---
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('expense_categories', ExpenseCategoryController::class);

    // --- CHAT MODULE ---
    Route::prefix('chat')->group(function () {
        Route::get('/contacts', [MessageController::class, 'getContacts']);
        Route::get('/messages/{receiverId}', [MessageController::class, 'getMessages']);
        Route::get('/unread-count', [MessageController::class, 'getGlobalUnreadCount']);
        Route::post('/send', [MessageController::class, 'sendMessage']);
        Route::post('/mark-as-read', [MessageController::class, 'markAsRead']);
        Route::post('/typing', [MessageController::class, 'typing']);
    });

    /**
     * 🔥 FORCED BROADCAST AUTH
     * This manually handles the Echo/Pusher authorization via POST.
     * Bypasses internal Laravel route conflicts and solves the 405 error on mobile.
     */
    Route::post('/broadcasting/auth', function (Request $request) {
        return Broadcast::auth($request);
    });
});