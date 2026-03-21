<?php

Route::redirect('/register', '/register/supplier');

use App\Http\Controllers\Admin\CompanyBrandingController;
use App\Http\Controllers\Admin\SupplierCoverageController;
use App\Http\Controllers\CategorySuggestionController;
use App\Http\Controllers\CertificationController;
use App\Http\Controllers\ContractArticleController;
use App\Http\Controllers\ContractHandoverController;
use App\Http\Controllers\ContractTemplateController;
use App\Http\Controllers\ContractWorkspaceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardPageController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\PasswordChangeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PublicSupplierController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SupplierApprovalController;
use App\Http\Controllers\SupplierBulkController;
use App\Http\Controllers\SupplierCapabilityController;
use App\Http\Controllers\SupplierCategoryController;
use App\Http\Controllers\SupplierContactController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierDocumentController;
use App\Http\Controllers\SupplierIntelligenceController;
use App\Http\Controllers\SupplierPortal\ClarificationController as SupplierPortalClarificationController;
use App\Http\Controllers\SupplierPortal\ContactController as SupplierPortalContactController;
use App\Http\Controllers\SupplierPortal\ContactProfileController as SupplierPortalContactProfileController;
use App\Http\Controllers\SupplierPortal\DashboardController as SupplierPortalDashboardController;
use App\Http\Controllers\SupplierPortal\DocumentController as SupplierPortalDocumentController;
use App\Http\Controllers\SupplierPortal\NotificationController as SupplierPortalNotificationController;
use App\Http\Controllers\SupplierPortal\ProfileController as SupplierPortalProfileController;
use App\Http\Controllers\SupplierPortal\QuotationController as SupplierPortalQuotationController;
use App\Http\Controllers\SupplierPortal\QuoteController as SupplierPortalQuoteController;
use App\Http\Controllers\SupplierPortal\RfqController as SupplierPortalRfqController;
use App\Http\Controllers\SupplierProfileController;
use App\Http\Controllers\SupplierWatchlistController;
use App\Http\Controllers\TaskBulkController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskLinkableSearchController;
use App\Http\Controllers\UserBulkController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// GET /logout fallback — for manual URL entry, perform logout then show logout screen.
Route::get('/logout', function (\Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect()->route('logout.screen');
});

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
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::post('/locale', [LocaleController::class, 'switch'])->name('locale.switch');

Route::get('/privacy-policy', function () {
    return Inertia::render('Public/PrivacyPolicy');
})->name('privacy-policy');
Route::get('/terms-and-conditions', function () {
    return Inertia::render('Public/TermsAndConditions');
})->name('terms-and-conditions');
Route::get('/terms-of-use', function () {
    return Inertia::render('Public/TermsOfUse');
})->name('terms-of-use');

// Logout success screen (no auth — user already logged out)
Route::get('/logout/success', function () {
    return Inertia::render('Auth/LogoutSuccess');
})->name('logout.screen');

// AI category suggestions (guest + auth; throttle only)
Route::post('/api/category-suggestions', [CategorySuggestionController::class, 'suggest'])
    ->middleware(['throttle:30,1'])
    ->name('api.category-suggestions');

// Password change + media (shared: suppliers and internal users)
Route::middleware(['auth', 'verified', 'ensure.active', 'require.password.change'])->group(function () {
    Route::get('/password/change', [PasswordChangeController::class, 'show'])->name('password.change');
    Route::post('/password/change', [PasswordChangeController::class, 'update'])->name('password.update.forced');

    Route::get('/media/{media}', [MediaController::class, 'show'])->name('media.show');
    Route::get('/media/{media}/download', [MediaController::class, 'download'])->name('media.download');
    Route::delete('/media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');
});

// Notification preferences (all authenticated roles: internal + supplier)
Route::middleware(['auth', 'verified', 'ensure.active', 'require.password.change'])->group(function () {
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index'])->name('notification-preferences.index');
    Route::post('/notification-preferences/batch', [NotificationPreferenceController::class, 'batch'])->name('notification-preferences.batch');
});

// Signed temporary media URL (auth + valid signature required; expires <= 15 min)
Route::get('/media/{media}/temporary', [MediaController::class, 'temporary'])
    ->middleware(['auth'])
    ->name('media.temporary');

// Supplier Portal — pending approval page (supplier role, approved not required)
Route::middleware([
    'auth',
    'verified',
    'ensure.active',
    'require.password.change',
    'ensure.role.supplier',
])->prefix('supplier')->name('supplier.')->group(function () {
    Route::get('/pending', [SupplierPortalDashboardController::class, 'pending'])->name('pending');
});

// Supplier Portal (supplier role only); password change checked before supplier approval
Route::middleware([
    'auth',
    'verified',
    'ensure.active',
    'require.password.change',
    'ensure.role.supplier',
    'ensure.supplier.approved',
])->prefix('supplier')->name('supplier.')->group(function () {
    Route::get('/dashboard', SupplierPortalDashboardController::class)->name('dashboard');
    Route::get('/profile', [SupplierPortalProfileController::class, 'edit'])->name('profile');
    Route::get('/profile/edit', [SupplierPortalProfileController::class, 'editFull'])->name('profile.edit');
    Route::patch('/profile', [SupplierPortalProfileController::class, 'update'])->name('profile.update');
    Route::get('/profile/reverse-geocode', [SupplierPortalProfileController::class, 'reverseGeocode'])->name('profile.reverse-geocode');
    Route::get('/profile/geocode-address', [SupplierPortalProfileController::class, 'geocodeAddress'])->name('profile.geocode-address');
    Route::get('/company/logo', [SupplierPortalProfileController::class, 'showLogo'])->name('company.logo');
    Route::get('/contact', [SupplierPortalContactProfileController::class, 'edit'])->name('contact.profile');
    Route::patch('/contact', [SupplierPortalContactProfileController::class, 'update'])->name('contact.profile.update');
    Route::get('/contact/media/{contact}/{type}', [SupplierPortalContactProfileController::class, 'showMedia'])->name('contact.media')->where('type', 'avatar|business_card_front|business_card_back');
    Route::get('/contacts/create', [SupplierPortalContactController::class, 'create'])->name('contacts.create');
    Route::post('/contacts', [SupplierPortalContactController::class, 'store'])->name('contacts.store');
    Route::get('/contacts/{contact}/edit', [SupplierPortalContactController::class, 'edit'])->name('contacts.edit');
    Route::patch('/contacts/{contact}', [SupplierPortalContactController::class, 'update'])->name('contacts.update');
    Route::post('/contacts/{contact}/set-primary', [SupplierPortalContactController::class, 'setPrimary'])->name('contacts.set-primary');
    Route::get('/documents/{document}', [SupplierPortalDocumentController::class, 'show'])->name('documents.show');
    Route::get('/documents/{document}/download', [SupplierPortalDocumentController::class, 'download'])->name('documents.download');
    Route::get('/rfqs', [SupplierPortalRfqController::class, 'index'])->name('rfqs.index');
    Route::get('/rfqs/{rfq}', [SupplierPortalRfqController::class, 'show'])->name('rfqs.show');
    Route::get('/rfqs/{rfq}/documents', [SupplierPortalRfqController::class, 'documents'])->name('rfqs.documents');
    Route::get('/rfqs/{rfq}/package-attachments', [SupplierPortalRfqController::class, 'packageAttachments'])->name('rfqs.package-attachments');
    Route::get('/rfqs/{rfq}/clarifications', [SupplierPortalRfqController::class, 'clarifications'])->name('rfqs.clarifications');
    Route::post('/rfqs/{rfq}/quotes', [SupplierPortalQuoteController::class, 'store'])->name('rfqs.quotes.store');
    Route::post('/rfqs/{rfq}/clarifications', [SupplierPortalClarificationController::class, 'store'])->name('rfqs.clarifications.store');
    Route::get('/quotations', [SupplierPortalQuotationController::class, 'index'])->name('quotations.index');
    Route::get('/notifications', [SupplierPortalNotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{notification}/read', [SupplierPortalNotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [SupplierPortalNotificationController::class, 'markAllRead'])->name('notifications.read-all');
});

// ERP / Internal users only (suppliers get 403)
Route::middleware(['auth', 'verified', 'ensure.active', 'require.password.change', 'ensure.supplier.approved', 'ensure.not.supplier'])->group(function () {

    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
    Route::get('/dashboard/metrics', [DashboardController::class, 'metrics']);

    Route::get('/search', [SearchController::class, 'search'])->name('search.global');
    Route::post('/search/recent', [SearchController::class, 'recordRecent'])->name('search.recent');
    Route::post('/search/favorites', [SearchController::class, 'addFavorite'])->name('search.favorites.add');
    Route::delete('/search/favorites/{id}', [SearchController::class, 'removeFavorite'])->name('search.favorites.remove');

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
        Route::get('/procurement-packages/{package}/print', [\App\Http\Controllers\ProcurementPackageController::class, 'print'])
            ->name('projects.procurement-packages.print');
        Route::get('/procurement-packages/{package}/pdf', [\App\Http\Controllers\ProcurementPackageController::class, 'pdf'])
            ->name('projects.procurement-packages.pdf');
        Route::get('/rfqs', [\App\Http\Controllers\RfqController::class, 'projectIndex'])
            ->name('projects.rfqs.index');
        Route::get('/procurement-packages/{package}/rfqs/create', [\App\Http\Controllers\RfqController::class, 'createFromPackage'])
            ->name('projects.procurement-packages.rfqs.create');
        Route::post('/procurement-packages/{package}/rfqs/store-full', [\App\Http\Controllers\RfqController::class, 'storeFromPackage'])
            ->name('projects.procurement-packages.rfqs.store-full');
        Route::post('/procurement-packages/{package}/attachments', [\App\Http\Controllers\ProcurementPackageController::class, 'storeAttachment'])
            ->name('projects.procurement-packages.attachments.store');
        Route::get('/procurement-packages/{package}/attachments/{attachment}/download', [\App\Http\Controllers\ProcurementPackageController::class, 'downloadAttachment'])
            ->name('projects.procurement-packages.attachments.download');
        Route::post('/procurement-packages/{package}/submit-for-approval', [\App\Http\Controllers\ProcurementPackageController::class, 'submitForApproval'])
            ->name('projects.procurement-packages.submit-for-approval');
        Route::post('/procurement-packages/{package}/approve', [\App\Http\Controllers\ProcurementPackageController::class, 'approve'])
            ->name('projects.procurement-packages.approve');
        Route::post('/procurement-packages/{package}/reject', [\App\Http\Controllers\ProcurementPackageController::class, 'reject'])
            ->name('projects.procurement-packages.reject');
        Route::post('/procurement-packages/{package}/transition', [\App\Http\Controllers\ProcurementPackageController::class, 'transition'])
            ->name('projects.procurement-packages.transition');
    });

    Route::post('/procurement-packages/{package}/rfqs', [\App\Http\Controllers\ProcurementRequestController::class, 'store'])
        ->name('procurement-packages.rfqs.store');

    // Tasks
    Route::delete('tasks/bulk-destroy', [TaskBulkController::class, 'destroy'])
        ->name('tasks.bulk-destroy');
    Route::get('tasks/linkables/search', TaskLinkableSearchController::class)
        ->name('tasks.linkables.search');
    Route::resource('tasks', TaskController::class);
    Route::post('tasks/{task}/reorder', [TaskController::class, 'reorder'])->name('tasks.reorder');
    Route::post('tasks/{task}/links', [TaskController::class, 'storeLink'])->name('tasks.links.store');
    Route::delete('tasks/{task}/links/{link}', [TaskController::class, 'destroyLink'])->name('tasks.links.destroy');
    Route::post('tasks/{task}/reminders', [TaskController::class, 'storeReminder'])->name('tasks.reminders.store');
    Route::delete('tasks/{task}/reminders/{reminder}', [TaskController::class, 'destroyReminder'])->name('tasks.reminders.destroy');
    Route::post('tasks/{task}/media', [TaskController::class, 'storeMedia'])->name('tasks.media.store');
    Route::delete('tasks/{task}/media/{media}', [TaskController::class, 'destroyMedia'])->name('tasks.media.destroy');
    Route::post('tasks/{task}/comments', [TaskCommentController::class, 'store'])
        ->name('tasks.comments.store');
    Route::delete('tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy'])
        ->name('tasks.comments.destroy');
    Route::post('tasks/{task}/comments/{comment}/media', [TaskCommentController::class, 'storeMedia'])
        ->name('tasks.comments.media.store');
    Route::delete('tasks/{task}/comments/{comment}/media/{media}', [TaskCommentController::class, 'destroyMedia'])
        ->name('tasks.comments.media.destroy');

    // Suppliers — canonical approval workflow (ONLY route for HTTP approval):
    // POST suppliers/{supplier}/approval → name('suppliers.approval') → SupplierApprovalController::approve.
    // Spatie permission is still named suppliers.approve (string) — that is NOT a route name.
    // Do not add POST suppliers/{supplier}/approve; it previously conflicted with action verbs.
    Route::delete('suppliers/bulk-destroy', [SupplierBulkController::class, 'destroy'])
        ->name('suppliers.bulk-destroy');
    Route::get('suppliers/check-cr', [SupplierController::class, 'checkCr'])
        ->name('suppliers.check-cr');
    Route::post('suppliers/{supplier}/approval', [SupplierApprovalController::class, 'approve'])
        ->name('suppliers.approval');
    Route::post('suppliers/{supplier}/reset-login', [SupplierApprovalController::class, 'resetLogin'])
        ->name('suppliers.reset-login');
    Route::get('/admin/suppliers/map', [SupplierCoverageController::class, 'index'])
        ->name('admin.suppliers.map')
        ->middleware(['auth']);
    Route::resource('suppliers', SupplierController::class);
    Route::post('suppliers/{supplier}/contacts', [SupplierContactController::class, 'store'])
        ->name('suppliers.contacts.store');
    Route::match(['put', 'patch'], 'suppliers/{supplier}/contacts/{contact}', [SupplierContactController::class, 'update'])
        ->name('suppliers.contacts.update');
    Route::post('suppliers/{supplier}/contacts/{contact}/set-primary', [SupplierContactController::class, 'setPrimary'])
        ->name('suppliers.contacts.set-primary');
    Route::delete('suppliers/{supplier}/contacts/{contact}', [SupplierContactController::class, 'destroy'])
        ->name('suppliers.contacts.destroy');
    Route::post('suppliers/{supplier}/documents', [SupplierDocumentController::class, 'store'])
        ->name('suppliers.documents.store');
    Route::delete('suppliers/{supplier}/documents/{document}', [SupplierDocumentController::class, 'destroy'])
        ->name('suppliers.documents.destroy');
    Route::post('suppliers/{supplier}/capabilities', [SupplierProfileController::class, 'updateCapabilities'])
        ->name('suppliers.capabilities.update');
    Route::post('suppliers/{supplier}/recalculate-risk', [SupplierIntelligenceController::class, 'recalculateRisk'])
        ->middleware('throttle:5,60')
        ->name('suppliers.recalculate-risk');

    Route::post('supplier-watchlist/{supplier}', [SupplierWatchlistController::class, 'store'])->name('supplier-watchlist.store');
    Route::delete('supplier-watchlist/{supplier}', [SupplierWatchlistController::class, 'destroy'])->name('supplier-watchlist.destroy');

    Route::get('supplier-intelligence', [SupplierIntelligenceController::class, 'index'])->name('supplier-intelligence.index');
    Route::get('supplier-intelligence/{supplier}', [SupplierIntelligenceController::class, 'show'])->name('supplier-intelligence.show');
    Route::post('supplier-intelligence/recalculate-all', [SupplierIntelligenceController::class, 'recalculateAll'])
        ->middleware('throttle:2,60')
        ->name('supplier-intelligence.recalculate-all');
    Route::post('supplier-intelligence/{supplier}/recalculate-ranking', [SupplierIntelligenceController::class, 'recalculateRanking'])
        ->name('supplier-intelligence.recalculate-ranking');
    Route::post('supplier-intelligence/recalculate-all-ranking', [SupplierIntelligenceController::class, 'recalculateAllRanking'])
        ->middleware('throttle:2,60')
        ->name('supplier-intelligence.recalculate-all-ranking');

    // Legacy admin prefix (kept as thin redirects for backward compatibility)
    Route::prefix('admin')->name('admin.')->middleware(['role:super_admin|admin'])->group(function () {
        Route::get('company-branding', fn () => redirect()->route('settings.company-branding'))
            ->name('company.branding');
        Route::post('company-branding', fn () => redirect()->route('settings.company-branding'))
            ->name('company.branding.update');
        Route::get('supplier-categories', fn () => redirect()->route('settings.supplier-categories.index'))
            ->name('supplier-categories.index');
        Route::get('supplier-capabilities', fn () => redirect()->route('settings.supplier-capabilities.index'))
            ->name('supplier-capabilities.index');
        Route::get('certifications', fn () => redirect()->route('settings.certifications.index'))
            ->name('certifications.index');
    });

    Route::prefix('settings')->name('settings.')->middleware(['role:super_admin|admin'])->group(function () {
        // Mail configuration (existing)
        Route::get('mail', [SettingsController::class, 'mailSettings'])
            ->middleware('permission:settings.manage')
            ->name('mail');
        Route::post('mail', [SettingsController::class, 'updateMailSettings'])
            ->middleware('permission:settings.manage')
            ->name('mail.update');
        Route::post('mail/test', [SettingsController::class, 'testMailSettings'])
            ->middleware('permission:settings.manage')
            ->name('mail.test');

        Route::get('whatsapp', [SettingsController::class, 'whatsappSettings'])
            ->middleware('permission:settings.manage')
            ->name('whatsapp');
        Route::post('whatsapp', [SettingsController::class, 'updateWhatsappSettings'])
            ->middleware('permission:settings.manage')
            ->name('whatsapp.update');
        Route::post('whatsapp/test', [SettingsController::class, 'testWhatsappSettings'])
            ->middleware('permission:settings.manage')
            ->name('whatsapp.test');
        Route::get('whatsapp/status', [SettingsController::class, 'whatsappConnectionStatus'])
            ->middleware('permission:settings.manage')
            ->name('whatsapp.status');

        Route::get('notification-templates', [\App\Http\Controllers\NotificationTemplateController::class, 'index'])
            ->middleware('permission:settings.manage')
            ->name('notification-templates.index');
        Route::get('notification-templates/{notificationTemplate}/edit', [\App\Http\Controllers\NotificationTemplateController::class, 'edit'])
            ->middleware('permission:settings.manage')
            ->whereNumber('notificationTemplate')
            ->name('notification-templates.edit');
        Route::put('notification-templates/{notificationTemplate}', [\App\Http\Controllers\NotificationTemplateController::class, 'update'])
            ->middleware('permission:settings.manage')
            ->whereNumber('notificationTemplate')
            ->name('notification-templates.update');
        Route::get('notification-templates/{notificationTemplate}/preview', [\App\Http\Controllers\NotificationTemplateController::class, 'preview'])
            ->middleware('permission:settings.manage')
            ->whereNumber('notificationTemplate')
            ->name('notification-templates.preview');
        Route::post('notification-templates/{notificationTemplate}/test', [\App\Http\Controllers\NotificationTemplateController::class, 'test'])
            ->middleware('permission:settings.manage')
            ->whereNumber('notificationTemplate')
            ->name('notification-templates.test');
        Route::put('notification-templates/event/{event_code}', [\App\Http\Controllers\NotificationTemplateController::class, 'updateWhatsApp'])
            ->middleware('permission:settings.manage')
            ->where('event_code', '[A-Za-z0-9._-]+')
            ->name('notification-templates.whatsapp-update');

        Route::get('ai-category-suggestions', [SettingsController::class, 'aiCategorySuggestions'])
            ->middleware('permission:settings.manage')
            ->name('ai-category-suggestions');
        Route::post('ai-category-suggestions', [SettingsController::class, 'updateAiCategorySuggestions'])
            ->middleware('permission:settings.manage')
            ->name('ai-category-suggestions.update');

        // Notification settings + history
        Route::get('notifications', [\App\Http\Controllers\NotificationSettingsController::class, 'settings'])
            ->middleware('permission:settings.manage')
            ->name('notifications.index');
        Route::post('notifications', [\App\Http\Controllers\NotificationSettingsController::class, 'update'])
            ->middleware('permission:settings.manage')
            ->name('notifications.update');
        Route::get('notifications/history', [\App\Http\Controllers\NotificationSettingsController::class, 'history'])
            ->middleware('permission:settings.manage')
            ->name('notifications.history');

        // Notification Configuration (business notification policies)
        Route::get('notification-configuration', [\App\Http\Controllers\NotificationConfigurationController::class, 'index'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.index');
        Route::get('notification-configuration/{setting}', [\App\Http\Controllers\NotificationConfigurationController::class, 'edit'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.edit');
        Route::put('notification-configuration/{setting}', [\App\Http\Controllers\NotificationConfigurationController::class, 'update'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.update');

        Route::post('notification-configuration/{setting}/recipients', [\App\Http\Controllers\NotificationConfigurationController::class, 'storeRecipient'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.recipients.store');
        Route::put('notification-configuration/{setting}/recipients/{recipient}', [\App\Http\Controllers\NotificationConfigurationController::class, 'updateRecipient'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.recipients.update');
        Route::delete('notification-configuration/{setting}/recipients/{recipient}', [\App\Http\Controllers\NotificationConfigurationController::class, 'destroyRecipient'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.recipients.destroy');

        Route::get('notification-configuration/user-search', [\App\Http\Controllers\NotificationConfigurationController::class, 'userSearch'])
            ->middleware('permission:settings.manage')
            ->name('notification-configuration.user-search');

        // Company branding
        Route::get('company-branding', [CompanyBrandingController::class, 'index'])
            ->middleware('permission:company.branding.manage')
            ->name('company-branding');
        Route::post('company-branding', [CompanyBrandingController::class, 'update'])
            ->middleware('permission:company.branding.manage')
            ->name('company-branding.update');

        // Supplier categories
        Route::get('supplier-categories/export', [SupplierCategoryController::class, 'export'])
            ->name('supplier-categories.export')
            ->middleware('permission:categories.manage');
        Route::get('supplier-categories/template/main', [SupplierCategoryController::class, 'templateMain'])
            ->name('supplier-categories.template.main')
            ->middleware('permission:categories.manage');
        Route::get('supplier-categories/template/sub', [SupplierCategoryController::class, 'templateSub'])
            ->name('supplier-categories.template.sub')
            ->middleware('permission:categories.manage');
        Route::get('supplier-categories/template/leaf', [SupplierCategoryController::class, 'templateLeaf'])
            ->name('supplier-categories.template.leaf')
            ->middleware('permission:categories.manage');
        Route::post('supplier-categories/import/main', [SupplierCategoryController::class, 'importMain'])
            ->name('supplier-categories.import.main')
            ->middleware('permission:categories.manage');
        Route::post('supplier-categories/import/sub', [SupplierCategoryController::class, 'importSub'])
            ->name('supplier-categories.import.sub')
            ->middleware('permission:categories.manage');
        Route::post('supplier-categories/import/leaf', [SupplierCategoryController::class, 'importLeaf'])
            ->name('supplier-categories.import.leaf')
            ->middleware('permission:categories.manage');
        Route::resource('supplier-categories', SupplierCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->middleware('permission:categories.manage');

        // Supplier capabilities
        Route::resource('supplier-capabilities', SupplierCapabilityController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->middleware('permission:capabilities.manage');

        // Certifications
        Route::resource('certifications', CertificationController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->middleware('permission:certifications.manage');

        // Users under settings
        Route::resource('users', UserController::class);

        // Roles audit + management
        Route::get('roles/audit', [\App\Http\Controllers\RoleController::class, 'audit'])
            ->name('roles.audit');

        Route::resource('roles', \App\Http\Controllers\RoleController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('roles');
    });

    Route::prefix('rfqs')->name('rfqs.')->group(function () {
        Route::get('/', [App\Http\Controllers\RfqController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\RfqController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\RfqController::class, 'store'])->name('store');
        Route::get('/{rfq}/comparison', [App\Http\Controllers\RfqController::class, 'comparison'])->name('comparison');
        Route::post('/{rfq}/comparison/recommend', [App\Http\Controllers\RfqController::class, 'saveRecommendation'])->name('comparison.recommend');
        Route::post('/{rfq}/comparison/recommend/submit', [App\Http\Controllers\RfqController::class, 'submitRecommendationForApproval'])->name('comparison.recommend.submit');
        Route::post('/{rfq}/comparison/recommend/approve', [App\Http\Controllers\RfqController::class, 'approveRecommendation'])->name('comparison.recommend.approve');
        Route::post('/{rfq}/comparison/recommend/reject', [App\Http\Controllers\RfqController::class, 'rejectRecommendation'])->name('comparison.recommend.reject');
        Route::post('/{rfq}/submit-for-approval', [App\Http\Controllers\RfqController::class, 'submitRfqForApproval'])->name('submit-for-approval');
        Route::post('/{rfq}/approve', [App\Http\Controllers\RfqController::class, 'approveRfq'])->name('approve');
        Route::post('/{rfq}/reject', [App\Http\Controllers\RfqController::class, 'rejectRfq'])->name('reject');
        Route::get('/{rfq}/documents/{document}/download', [App\Http\Controllers\RfqController::class, 'downloadDocument'])->name('documents.download');
        Route::get('/{rfq}/package-attachments/{attachment}/download', [App\Http\Controllers\RfqController::class, 'downloadPackageAttachment'])->name('package-attachments.download');
        Route::get('/{rfq}', [App\Http\Controllers\RfqController::class, 'show'])->name('show');
        Route::get('/{rfq}/print', [App\Http\Controllers\RfqController::class, 'print'])->name('print');
        Route::get('/{rfq}/pdf', [App\Http\Controllers\RfqController::class, 'pdf'])->name('pdf');
        Route::put('/{rfq}', [App\Http\Controllers\RfqController::class, 'update'])->name('update');
        Route::delete('/{rfq}', [App\Http\Controllers\RfqController::class, 'destroy'])->name('destroy');
        Route::post('/{rfq}/issue', [App\Http\Controllers\RfqController::class, 'issue'])->name('issue');
        Route::post('/{rfq}/mark-responses-received', [App\Http\Controllers\RfqController::class, 'markResponsesReceived'])->name('mark-responses-received');
        Route::post('/{rfq}/evaluate', [App\Http\Controllers\RfqController::class, 'evaluate'])->name('evaluate');
        Route::post('/{rfq}/evaluations', [App\Http\Controllers\RfqController::class, 'evaluateSupplier'])->name('evaluations.store');
        // Award: `awardSupplier` (modal) + `awardFromComparison` (comparison tab) — both persist RfqAward. Legacy `RfqController::award()` (SupplierQuote) is not registered here.
        Route::post('/{rfq}/award', [App\Http\Controllers\RfqController::class, 'awardSupplier'])->name('award');
        Route::post('/{rfq}/contract', [App\Http\Controllers\RfqController::class, 'createContract'])->name('contract.create');
        Route::post('/{rfq}/award-from-comparison', [App\Http\Controllers\RfqController::class, 'awardFromComparison'])->name('award-from-comparison');
        Route::post('/{rfq}/close', [App\Http\Controllers\RfqController::class, 'close'])->name('close');
        Route::post('/{rfq}/transition', [App\Http\Controllers\RfqController::class, 'transition'])->name('transition');
        Route::get('/{rfq}/invite-suppliers', [App\Http\Controllers\RfqSupplierController::class, 'search'])->name('invite-suppliers');
        Route::post('/{rfq}/suppliers', [App\Http\Controllers\RfqSupplierController::class, 'invite'])->name('suppliers.invite');
        Route::delete('/{rfq}/suppliers/{rfqSupplier}', [App\Http\Controllers\RfqSupplierController::class, 'remove'])->name('suppliers.remove');
        Route::post('/{rfq}/quotes', [App\Http\Controllers\RfqController::class, 'storeQuote'])->name('quotes.store');
        Route::post('/{rfq}/documents', [App\Http\Controllers\RfqDocumentController::class, 'store'])->name('documents.store');
        Route::delete('/{rfq}/documents/{document}', [App\Http\Controllers\RfqDocumentController::class, 'destroy'])->name('documents.destroy');
        Route::post('/{rfq}/clarifications', [App\Http\Controllers\RfqClarificationController::class, 'store'])->name('clarifications.store');
        Route::post('/{rfq}/clarifications/{clarification}/answer', [App\Http\Controllers\RfqClarificationController::class, 'answer'])->name('clarifications.answer');
        Route::post('/{rfq}/clarifications/{clarification}/visibility', [App\Http\Controllers\RfqClarificationController::class, 'updateVisibility'])->name('clarifications.visibility');
    });

    Route::prefix('contract-articles')->name('contract-articles.')->group(function () {
        Route::get('/', [ContractArticleController::class, 'index'])->name('index');
        Route::get('/create', [ContractArticleController::class, 'create'])->name('create');
        Route::get('/{contract_article}', [ContractArticleController::class, 'show'])->name('show');
        Route::get('/{contract_article}/edit', [ContractArticleController::class, 'edit'])->name('edit');
        Route::post('/', [ContractArticleController::class, 'store'])->name('store');
        Route::put('/{contract_article}', [ContractArticleController::class, 'update'])->name('update');
        Route::post('/{contract_article}/archive', [ContractArticleController::class, 'archive'])->name('archive');
        Route::post('/{contract_article}/activate', [ContractArticleController::class, 'activate'])->name('activate');
        Route::get('/{contract_article}/compare', [ContractArticleController::class, 'compare'])->name('compare');
        Route::post('/{contract_article}/versions/{version}/restore', [ContractArticleController::class, 'restore'])->name('restore');
    });

    Route::prefix('contract-templates')->name('contract-templates.')->group(function () {
        Route::get('/', [ContractTemplateController::class, 'index'])->name('index');
        Route::get('/create', [ContractTemplateController::class, 'create'])->name('create');
        Route::post('/', [ContractTemplateController::class, 'store'])->name('store');
        Route::get('/{contract_template}', [ContractTemplateController::class, 'show'])->name('show');
        Route::get('/{contract_template}/edit', [ContractTemplateController::class, 'edit'])->name('edit');
        Route::put('/{contract_template}', [ContractTemplateController::class, 'update'])->name('update');
        Route::post('/{contract_template}/archive', [ContractTemplateController::class, 'archive'])->name('archive');
        Route::post('/{contract_template}/activate', [ContractTemplateController::class, 'activate'])->name('activate');
    });

    Route::prefix('contracts')->name('contracts.')->group(function () {
        Route::get('/', [App\Http\Controllers\ContractController::class, 'index'])->name('index');
        Route::get('/create-from-rfq/{rfq}', [ContractHandoverController::class, 'createFromRfqForm'])->name('create-from-rfq');
        Route::post('/store-from-rfq/{rfq}', [ContractHandoverController::class, 'storeFromRfq'])->name('store-from-rfq');
        Route::get('/{contract}', [App\Http\Controllers\ContractController::class, 'show'])->name('show');
        Route::get('/{contract}/edit', [ContractWorkspaceController::class, 'edit'])->name('edit');
        Route::put('/{contract}', [ContractWorkspaceController::class, 'update'])->name('update');
        Route::post('/{contract}/status', [ContractWorkspaceController::class, 'updateStatus'])->name('update-status');
        Route::post('/{contract}/submit-for-review', [ContractWorkspaceController::class, 'submitForReview'])->name('submit-for-review');
        Route::post('/{contract}/review-decision', [ContractWorkspaceController::class, 'storeReviewDecision'])->name('review-decision');
        Route::post('/{contract}/draft-articles', [ContractWorkspaceController::class, 'addArticle'])->name('add-article');
        Route::put('/{contract}/draft-articles/{draftArticle}', [ContractWorkspaceController::class, 'updateDraftArticle'])->name('draft-articles.update');
        Route::post('/{contract}/draft-articles/{draftArticle}/negotiation', [ContractWorkspaceController::class, 'updateDraftArticleNegotiation'])->name('draft-articles.negotiation.update');
        Route::delete('/{contract}/draft-articles/{draftArticle}', [ContractWorkspaceController::class, 'removeDraftArticle'])->name('draft-articles.remove');
        Route::post('/{contract}/draft-articles/reorder', [ContractWorkspaceController::class, 'reorderDraftArticles'])->name('draft-articles.reorder');
        Route::get('/{contract}/draft-articles/{draftArticle}/compare', [ContractWorkspaceController::class, 'compareDraftArticle'])->name('draft-articles.compare');
        Route::post('/{contract}/draft-articles/{draftArticle}/versions/{version}/restore', [ContractWorkspaceController::class, 'restoreDraftArticleVersion'])->name('draft-articles.restore-version');
        Route::post('/{contract}/variables/overrides', [App\Http\Controllers\ContractVariableController::class, 'saveOverrides'])->name('variables.save-overrides');
        Route::post('/{contract}/variables/preview-render', [App\Http\Controllers\ContractVariableController::class, 'previewRender'])->name('variables.preview-render');
        Route::post('/{contract}/documents/generate-contract-docx', [App\Http\Controllers\ContractDocumentController::class, 'generateContractDocx'])->name('documents.generate-contract-docx');
        Route::post('/{contract}/documents/generate-contract-pdf', [App\Http\Controllers\ContractDocumentController::class, 'generateContractPdf'])->name('documents.generate-contract-pdf');
        Route::post('/{contract}/documents/generate-signature-docx', [App\Http\Controllers\ContractDocumentController::class, 'generateSignaturePackageDocx'])->name('documents.generate-signature-docx');
        Route::post('/{contract}/documents/generate-signature-pdf', [App\Http\Controllers\ContractDocumentController::class, 'generateSignaturePackagePdf'])->name('documents.generate-signature-pdf');
        Route::get('/{contract}/documents/{document}/download', [App\Http\Controllers\ContractDocumentController::class, 'download'])->name('documents.download');
        Route::post('/{contract}/send-signature', [App\Http\Controllers\ContractController::class, 'sendForSignature'])->name('send-signature');
        Route::post('/{contract}/activate', [App\Http\Controllers\ContractController::class, 'activate'])->name('activate');
        Route::post('/{contract}/complete', [App\Http\Controllers\ContractController::class, 'complete'])->name('complete');
        Route::post('/{contract}/terminate', [App\Http\Controllers\ContractController::class, 'terminate'])->name('terminate');
        Route::post('/{contract}/issue-signature-package', [App\Http\Controllers\ContractController::class, 'issueSignaturePackage'])->name('issue-signature-package');
        Route::post('/{contract}/signatories', [App\Http\Controllers\ContractSignatureController::class, 'storeSignatory'])->name('signatories.store');
        Route::put('/{contract}/signatories/{signatory}', [App\Http\Controllers\ContractSignatureController::class, 'updateSignatory'])->name('signatories.update');
        Route::post('/{contract}/signatories/{signatory}/mark-status', [App\Http\Controllers\ContractSignatureController::class, 'markSignatoryStatus'])->name('signatories.mark-status');
        Route::post('/{contract}/mark-executed', [App\Http\Controllers\ContractSignatureController::class, 'markExecuted'])->name('mark-executed');
        Route::post('/{contract}/initialize-administration', [App\Http\Controllers\ContractAdministrationController::class, 'initializeAdministrationBaseline'])->name('initialize-administration');
        Route::post('/{contract}/variations', [App\Http\Controllers\ContractVariationController::class, 'store'])->name('variations.store');
        Route::put('/{contract}/variations/{variation}', [App\Http\Controllers\ContractVariationController::class, 'update'])->name('variations.update');
        Route::post('/{contract}/variations/{variation}/submit', [App\Http\Controllers\ContractVariationController::class, 'submit'])->name('variations.submit');
        Route::post('/{contract}/variations/{variation}/approve', [App\Http\Controllers\ContractVariationController::class, 'approve'])->name('variations.approve');
        Route::post('/{contract}/variations/{variation}/reject', [App\Http\Controllers\ContractVariationController::class, 'reject'])->name('variations.reject');
        Route::post('/{contract}/invoices', [App\Http\Controllers\ContractInvoiceController::class, 'store'])->name('invoices.store');
        Route::put('/{contract}/invoices/{invoice}', [App\Http\Controllers\ContractInvoiceController::class, 'update'])->name('invoices.update');
        Route::post('/{contract}/invoices/{invoice}/submit', [App\Http\Controllers\ContractInvoiceController::class, 'submit'])->name('invoices.submit');
        Route::post('/{contract}/invoices/{invoice}/approve', [App\Http\Controllers\ContractInvoiceController::class, 'approve'])->name('invoices.approve');
        Route::post('/{contract}/invoices/{invoice}/reject', [App\Http\Controllers\ContractInvoiceController::class, 'reject'])->name('invoices.reject');
        Route::post('/{contract}/invoices/{invoice}/mark-paid', [App\Http\Controllers\ContractInvoiceController::class, 'markPaid'])->name('invoices.mark-paid');
        Route::post('/{contract}/closeout/initialize', [App\Http\Controllers\ContractCloseoutController::class, 'initializeCloseout'])->name('closeout.initialize');
        Route::post('/{contract}/closeout/complete', [App\Http\Controllers\ContractCloseoutController::class, 'completeCloseout'])->name('closeout.complete');
        Route::post('/{contract}/defects/initialize-warranty', [App\Http\Controllers\ContractDefectController::class, 'initializeWarrantyWindow'])->name('defects.initialize-warranty');
        Route::post('/{contract}/defects', [App\Http\Controllers\ContractDefectController::class, 'storeDefect'])->name('defects.store');
        Route::post('/{contract}/defects/{defect}/status', [App\Http\Controllers\ContractDefectController::class, 'updateDefectStatus'])->name('defects.update-status');
        Route::post('/{contract}/retention', [App\Http\Controllers\ContractRetentionReleaseController::class, 'store'])->name('retention.store');
        Route::post('/{contract}/retention/{release}/submit', [App\Http\Controllers\ContractRetentionReleaseController::class, 'submit'])->name('retention.submit');
        Route::post('/{contract}/retention/{release}/approve', [App\Http\Controllers\ContractRetentionReleaseController::class, 'approve'])->name('retention.approve');
        Route::post('/{contract}/retention/{release}/reject', [App\Http\Controllers\ContractRetentionReleaseController::class, 'reject'])->name('retention.reject');
        Route::post('/{contract}/retention/{release}/mark-released', [App\Http\Controllers\ContractRetentionReleaseController::class, 'markReleased'])->name('retention.mark-released');
        Route::post('/{contract}/claims', [App\Http\Controllers\ContractClaimController::class, 'store'])->name('claims.store');
        Route::put('/{contract}/claims/{claim}', [App\Http\Controllers\ContractClaimController::class, 'update'])->name('claims.update');
        Route::post('/{contract}/claims/{claim}/submit', [App\Http\Controllers\ContractClaimController::class, 'submit'])->name('claims.submit');
        Route::post('/{contract}/claims/{claim}/review', [App\Http\Controllers\ContractClaimController::class, 'review'])->name('claims.review');
        Route::post('/{contract}/claims/{claim}/resolve', [App\Http\Controllers\ContractClaimController::class, 'resolve'])->name('claims.resolve');
        Route::post('/{contract}/claims/{claim}/reject', [App\Http\Controllers\ContractClaimController::class, 'reject'])->name('claims.reject');
        Route::post('/{contract}/notices', [App\Http\Controllers\ContractNoticeController::class, 'store'])->name('notices.store');
        Route::put('/{contract}/notices/{notice}', [App\Http\Controllers\ContractNoticeController::class, 'update'])->name('notices.update');
        Route::post('/{contract}/notices/{notice}/issue', [App\Http\Controllers\ContractNoticeController::class, 'issue'])->name('notices.issue');
        Route::post('/{contract}/notices/{notice}/respond', [App\Http\Controllers\ContractNoticeController::class, 'respond'])->name('notices.respond');
        Route::post('/{contract}/notices/{notice}/close', [App\Http\Controllers\ContractNoticeController::class, 'close'])->name('notices.close');
        Route::post('/{contract}/securities', [App\Http\Controllers\ContractSecurityController::class, 'store'])->name('securities.store');
        Route::put('/{contract}/securities/{security}', [App\Http\Controllers\ContractSecurityController::class, 'update'])->name('securities.update');
        Route::post('/{contract}/securities/{security}/status', [App\Http\Controllers\ContractSecurityController::class, 'updateStatus'])->name('securities.update-status');
        Route::post('/{contract}/obligations', [App\Http\Controllers\ContractObligationController::class, 'store'])->name('obligations.store');
        Route::put('/{contract}/obligations/{obligation}', [App\Http\Controllers\ContractObligationController::class, 'update'])->name('obligations.update');
        Route::post('/{contract}/obligations/{obligation}/status', [App\Http\Controllers\ContractObligationController::class, 'updateStatus'])->name('obligations.update-status');
    });

    Route::prefix('purchase-requests')->name('purchase-requests.')->group(function () {
        Route::get('/', [\App\Http\Controllers\PurchaseRequestController::class, 'index'])->name('index');
        Route::get('/create', [\App\Http\Controllers\PurchaseRequestController::class, 'create'])->name('create');
        Route::post('/', [\App\Http\Controllers\PurchaseRequestController::class, 'store'])->name('store');
        Route::get('/{purchaseRequest}', [\App\Http\Controllers\PurchaseRequestController::class, 'show'])->name('show');
        Route::put('/{purchaseRequest}', [\App\Http\Controllers\PurchaseRequestController::class, 'update'])->name('update');
        Route::delete('/{purchaseRequest}', [\App\Http\Controllers\PurchaseRequestController::class, 'destroy'])->name('destroy');
        Route::post('/{purchaseRequest}/submit', [\App\Http\Controllers\PurchaseRequestController::class, 'submit'])->name('submit');
        Route::post('/{purchaseRequest}/approve', [\App\Http\Controllers\PurchaseRequestController::class, 'approve'])->name('approve');
        Route::post('/{purchaseRequest}/reject', [\App\Http\Controllers\PurchaseRequestController::class, 'reject'])->name('reject');
    });

    // Users
    Route::delete('users/bulk-destroy', [UserBulkController::class, 'destroy'])->name('users.bulk-destroy');
    Route::post('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/profile/avatar', [ProfileController::class, 'avatar'])->name('profile.avatar');
});

// Public CR check (no auth) — for registration portal
Route::get('register/suppliers/check-cr', [SupplierController::class, 'checkCr'])
    ->name('suppliers.public.check-cr');

require __DIR__.'/auth.php';
