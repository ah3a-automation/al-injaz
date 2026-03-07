<?php
Route::redirect('/register', '/register/supplier');

use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PasswordChangeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PublicSupplierController;
use App\Http\Controllers\SupplierApprovalController;
use App\Http\Controllers\SupplierBulkController;
use App\Http\Controllers\SupplierContactController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CertificationController;
use App\Http\Controllers\SupplierCategoryController;
use App\Http\Controllers\SupplierCapabilityController;
use App\Http\Controllers\SupplierDocumentController;
use App\Http\Controllers\SupplierProfileController;
use App\Http\Controllers\TaskBulkController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserBulkController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public supplier registration (no auth) — must be before auth middleware
Route::middleware(['throttle:30,1'])->group(function () {
    Route::get('/register/supplier', [PublicSupplierController::class, 'showRegistrationForm'])
        ->name('supplier.register.form');
    Route::post('/register/supplier', [PublicSupplierController::class, 'register'])
        ->name('supplier.register');
    Route::get('/register/supplier/check-cr', [PublicSupplierController::class, 'checkCr'])
        ->name('supplier.register.check-cr');
    Route::get('/register/supplier/success', [PublicSupplierController::class, 'showSuccess'])
        ->name('supplier.success');
    Route::get('/supplier/complete/{token}', [PublicSupplierController::class, 'showCompleteForm'])
        ->name('supplier.complete.form');
    Route::post('/supplier/complete/{token}', [PublicSupplierController::class, 'completeProfile'])
        ->name('supplier.complete');
    Route::get('/supplier/status', [PublicSupplierController::class, 'showStatus'])
        ->name('supplier.status');
});

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified', 'ensure.active', 'require.password.change', 'ensure.supplier.approved'])->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // Password change (must be reachable when must_change_password is true)
    Route::get('/password/change', [PasswordChangeController::class, 'show'])->name('password.change');
    Route::post('/password/change', [PasswordChangeController::class, 'update'])->name('password.update.forced');

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/recent', [NotificationController::class, 'recent'])->name('notifications.recent');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');

    // Settings (mail)
    Route::get('settings/mail', [SettingsController::class, 'mailSettings'])->name('settings.mail');
    Route::post('settings/mail', [SettingsController::class, 'updateMailSettings'])->name('settings.mail.update');
    Route::post('settings/mail/test', [SettingsController::class, 'testMailSettings'])->name('settings.mail.test');

    // Exports
    Route::get('exports', [ExportController::class, 'index'])->name('exports.index');
    Route::post('exports', [ExportController::class, 'store'])->name('exports.store');
    Route::get('exports/{export}', [ExportController::class, 'show'])->name('exports.show');

    // Bulk destroy MUST come before the resource route
    Route::delete('projects/bulk-destroy', [ProjectController::class, 'bulkDestroy'])
        ->name('projects.bulk-destroy');

    // Resource route
    Route::resource('projects', ProjectController::class);

    Route::get('/boq-import', [\App\Http\Controllers\ProjectBoqImportController::class, 'index'])
        ->name('boq-import.index');

    Route::prefix('projects/{project}')->group(function () {
        Route::get('/systems', [\App\Http\Controllers\ProjectSystemController::class, 'index'])
            ->name('projects.systems.index');
        Route::post('/systems', [\App\Http\Controllers\ProjectSystemController::class, 'store'])
            ->name('projects.systems.store');
        Route::put('/systems/{system}', [\App\Http\Controllers\ProjectSystemController::class, 'update'])
            ->name('projects.systems.update');
        Route::delete('/systems/{system}', [\App\Http\Controllers\ProjectSystemController::class, 'destroy'])
            ->name('projects.systems.destroy');

        Route::get('/boq', [\App\Http\Controllers\ProjectBoqController::class, 'show'])
            ->name('projects.boq.show');
        Route::get('/boq-import', [\App\Http\Controllers\ProjectBoqImportController::class, 'show'])
            ->name('projects.boq-import.show');
        Route::post('/boq-import/preview', [\App\Http\Controllers\ProjectBoqImportController::class, 'preview'])
            ->name('projects.boq-import.preview');
        Route::post('/boq-import', [\App\Http\Controllers\ProjectBoqImportController::class, 'store'])
            ->name('projects.boq-import.store');
        Route::post('/boq-import/cancel', [\App\Http\Controllers\ProjectBoqImportController::class, 'cancel'])
            ->name('projects.boq-import.cancel');

        Route::get('/packages', [\App\Http\Controllers\ProjectPackageController::class, 'index'])
            ->name('projects.packages.index');
        Route::post('/packages', [\App\Http\Controllers\ProjectPackageController::class, 'store'])
            ->name('projects.packages.store');
        Route::put('/packages/{package}', [\App\Http\Controllers\ProjectPackageController::class, 'update'])
            ->name('projects.packages.update');
        Route::delete('/packages/{package}', [\App\Http\Controllers\ProjectPackageController::class, 'destroy'])
            ->name('projects.packages.destroy');

        Route::get('/procurement-packages', [\App\Http\Controllers\ProcurementPackageController::class, 'index'])
            ->name('projects.procurement-packages.index');
        Route::get('/procurement-packages/create', [\App\Http\Controllers\ProcurementPackageController::class, 'create'])
            ->name('projects.procurement-packages.create');
        Route::post('/procurement-packages', [\App\Http\Controllers\ProcurementPackageController::class, 'store'])
            ->name('projects.procurement-packages.store');
        Route::get('/procurement-packages/{package}', [\App\Http\Controllers\ProcurementPackageController::class, 'show'])
            ->name('projects.procurement-packages.show');
        Route::get('/rfqs', [\App\Http\Controllers\RfqController::class, 'projectIndex'])
            ->name('projects.rfqs.index');
        Route::get('/procurement-packages/{package}/rfqs/create', [\App\Http\Controllers\RfqController::class, 'createFromPackage'])
            ->name('projects.procurement-packages.rfqs.create');
        Route::post('/procurement-packages/{package}/rfqs/store-full', [\App\Http\Controllers\RfqController::class, 'storeFromPackage'])
            ->name('projects.procurement-packages.rfqs.store-full');
        Route::post('/procurement-packages/{package}/attachments', [\App\Http\Controllers\ProcurementPackageController::class, 'storeAttachment'])
            ->name('projects.procurement-packages.attachments.store');
    });

    Route::post('/procurement-packages/{package}/rfqs', [\App\Http\Controllers\ProcurementRequestController::class, 'store'])
        ->name('procurement-packages.rfqs.store');

    // Tasks
    Route::delete('tasks/bulk-destroy', [TaskBulkController::class, 'destroy'])
        ->name('tasks.bulk-destroy');
    Route::resource('tasks', TaskController::class);
    Route::post('tasks/{task}/comments', [TaskCommentController::class, 'store'])
        ->name('tasks.comments.store');
    Route::delete('tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy'])
        ->name('tasks.comments.destroy');

    // Suppliers
    Route::delete('suppliers/bulk-destroy', [SupplierBulkController::class, 'destroy'])
        ->name('suppliers.bulk-destroy');
    Route::get('suppliers/check-cr', [SupplierController::class, 'checkCr'])
        ->name('suppliers.check-cr');
    Route::post('suppliers/{supplier}/approve', [SupplierController::class, 'approve'])
        ->name('suppliers.approve');
    Route::post('suppliers/{supplier}/approval', [SupplierApprovalController::class, 'approve'])
        ->name('suppliers.approval');
    Route::post('suppliers/{supplier}/reset-login', [SupplierApprovalController::class, 'resetLogin'])
        ->name('suppliers.reset-login');
    Route::resource('suppliers', SupplierController::class);
    Route::post('suppliers/{supplier}/contacts', [SupplierContactController::class, 'store'])
        ->name('suppliers.contacts.store');
    Route::put('suppliers/{supplier}/contacts/{contact}', [SupplierContactController::class, 'update'])
        ->name('suppliers.contacts.update');
    Route::delete('suppliers/{supplier}/contacts/{contact}', [SupplierContactController::class, 'destroy'])
        ->name('suppliers.contacts.destroy');
    Route::post('suppliers/{supplier}/documents', [SupplierDocumentController::class, 'store'])
        ->name('suppliers.documents.store');
    Route::delete('suppliers/{supplier}/documents/{document}', [SupplierDocumentController::class, 'destroy'])
        ->name('suppliers.documents.destroy');
    Route::post('suppliers/{supplier}/capabilities', [SupplierProfileController::class, 'updateCapabilities'])
        ->name('suppliers.capabilities.update');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::resource('supplier-categories', SupplierCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::resource('supplier-capabilities', SupplierCapabilityController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::resource('certifications', CertificationController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });

    Route::prefix('rfqs')->name('rfqs.')->group(function () {
        Route::get('/',                                           [App\Http\Controllers\RfqController::class, 'index'])->name('index');
        Route::get('/create',                                     [App\Http\Controllers\RfqController::class, 'create'])->name('create');
        Route::post('/',                                          [App\Http\Controllers\RfqController::class, 'store'])->name('store');
        Route::get('/{rfq}',                                      [App\Http\Controllers\RfqController::class, 'show'])->name('show');
        Route::put('/{rfq}',                                      [App\Http\Controllers\RfqController::class, 'update'])->name('update');
        Route::delete('/{rfq}',                                   [App\Http\Controllers\RfqController::class, 'destroy'])->name('destroy');
        Route::post('/{rfq}/issue',                               [App\Http\Controllers\RfqController::class, 'issue'])->name('issue');
        Route::post('/{rfq}/mark-responses-received',             [App\Http\Controllers\RfqController::class, 'markResponsesReceived'])->name('mark-responses-received');
        Route::post('/{rfq}/evaluate',                            [App\Http\Controllers\RfqController::class, 'evaluate'])->name('evaluate');
        Route::post('/{rfq}/award',                               [App\Http\Controllers\RfqController::class, 'award'])->name('award');
        Route::post('/{rfq}/award-from-comparison',               [App\Http\Controllers\RfqController::class, 'awardFromComparison'])->name('award-from-comparison');
        Route::post('/{rfq}/close',                               [App\Http\Controllers\RfqController::class, 'close'])->name('close');
        Route::get('/{rfq}/invite-suppliers',                     [App\Http\Controllers\RfqSupplierController::class, 'search'])->name('invite-suppliers');
        Route::post('/{rfq}/suppliers',                           [App\Http\Controllers\RfqSupplierController::class, 'invite'])->name('suppliers.invite');
        Route::delete('/{rfq}/suppliers/{rfqSupplier}',           [App\Http\Controllers\RfqSupplierController::class, 'remove'])->name('suppliers.remove');
        Route::post('/{rfq}/quotes',                               [App\Http\Controllers\RfqController::class, 'storeQuote'])->name('quotes.store');
        Route::post('/{rfq}/documents',                            [App\Http\Controllers\RfqDocumentController::class, 'store'])->name('documents.store');
        Route::delete('/{rfq}/documents/{document}',              [App\Http\Controllers\RfqDocumentController::class, 'destroy'])->name('documents.destroy');
        Route::post('/{rfq}/clarifications',                      [App\Http\Controllers\RfqClarificationController::class, 'store'])->name('clarifications.store');
        Route::post('/{rfq}/clarifications/{clarification}/answer', [App\Http\Controllers\RfqClarificationController::class, 'answer'])->name('clarifications.answer');
    });

    Route::prefix('purchase-requests')->name('purchase-requests.')->group(function () {
        Route::get('/',                                    [\App\Http\Controllers\PurchaseRequestController::class, 'index'])->name('index');
        Route::get('/create',                              [\App\Http\Controllers\PurchaseRequestController::class, 'create'])->name('create');
        Route::post('/',                                   [\App\Http\Controllers\PurchaseRequestController::class, 'store'])->name('store');
        Route::get('/{purchaseRequest}',                   [\App\Http\Controllers\PurchaseRequestController::class, 'show'])->name('show');
        Route::put('/{purchaseRequest}',                   [\App\Http\Controllers\PurchaseRequestController::class, 'update'])->name('update');
        Route::delete('/{purchaseRequest}',                [\App\Http\Controllers\PurchaseRequestController::class, 'destroy'])->name('destroy');
        Route::post('/{purchaseRequest}/submit',           [\App\Http\Controllers\PurchaseRequestController::class, 'submit'])->name('submit');
        Route::post('/{purchaseRequest}/approve',          [\App\Http\Controllers\PurchaseRequestController::class, 'approve'])->name('approve');
        Route::post('/{purchaseRequest}/reject',           [\App\Http\Controllers\PurchaseRequestController::class, 'reject'])->name('reject');
    });

    // Users
    Route::delete('users/bulk-destroy', [UserBulkController::class, 'destroy'])->name('users.bulk-destroy');
    Route::post('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');
    Route::resource('users', UserController::class);

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Public CR check (no auth) — for registration portal
Route::get('register/suppliers/check-cr', [SupplierController::class, 'checkCr'])
    ->name('suppliers.public.check-cr');

require __DIR__.'/auth.php';