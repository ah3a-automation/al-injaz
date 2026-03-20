<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\User;
use App\Policies\ContractArticlePolicy;
use App\Policies\ContractTemplatePolicy;
use App\Policies\ProjectPolicy;
use App\Policies\SupplierPolicy;
use App\Policies\TaskPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Project::class       => ProjectPolicy::class,
        \App\Models\ProjectSystem::class   => \App\Policies\ProjectSystemPolicy::class,
        \App\Models\ProjectPackage::class  => \App\Policies\ProjectPackagePolicy::class,
        \App\Models\PurchaseRequest::class => \App\Policies\PurchaseRequestPolicy::class,
        \App\Models\MarginException::class   => \App\Policies\MarginExceptionPolicy::class,
        \App\Models\FinancialSnapshot::class => \App\Policies\FinancialSnapshotPolicy::class,
        \App\Models\Rfq::class => \App\Policies\RfqPolicy::class,
        \App\Models\ProcurementPackage::class => \App\Policies\ProcurementPackagePolicy::class,
        \App\Models\ProcurementRequest::class => \App\Policies\ProcurementRequestPolicy::class,
        Task::class          => TaskPolicy::class,
        Supplier::class      => SupplierPolicy::class,
        User::class             => UserPolicy::class,
        ContractArticle::class  => ContractArticlePolicy::class,
        ContractTemplate::class => ContractTemplatePolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}