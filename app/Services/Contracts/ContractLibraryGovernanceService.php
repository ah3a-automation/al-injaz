<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\ContractTemplateVersion;
use App\Models\User;
use App\Services\System\NotificationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractLibraryGovernanceService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly ContractTemplateService $templateService,
    ) {}

    public function submitArticle(ContractArticle $article, User $actor): ContractArticle
    {
        if (! $article->canBeSubmitted()) {
            throw new RuntimeException('Article cannot be submitted for approval in its current state.');
        }

        return DB::transaction(function () use ($article, $actor): ContractArticle {
            $article->refresh();

            $wasRevision = $article->approval_status === ContractArticle::APPROVAL_LEGAL_APPROVED
                && $article->status === ContractArticle::STATUS_ACTIVE;

            $article->approval_status = ContractArticle::APPROVAL_SUBMITTED;
            $article->submitted_at = now();
            $article->submitted_by_user_id = $actor->id;
            $article->rejection_reason = null;

            if ($wasRevision) {
                $article->contracts_manager_approved_at = null;
                $article->contracts_manager_approved_by = null;
                $article->legal_approved_at = null;
                $article->legal_approved_by = null;
            }

            $article->save();

            $this->notifyPermission(
                'contract.library.approve_contracts',
                'contract.article.submitted',
                'Contract article pending contracts approval',
                'Article '.$article->code.' was submitted for approval.',
                route('contract-articles.show', $article)
            );

            return $article->fresh();
        });
    }

    public function approveArticleContracts(ContractArticle $article, User $actor): ContractArticle
    {
        if (($article->approval_status ?? ContractArticle::APPROVAL_NONE) !== ContractArticle::APPROVAL_SUBMITTED) {
            throw new RuntimeException('Article is not awaiting contracts manager approval.');
        }

        return DB::transaction(function () use ($article, $actor): ContractArticle {
            $article->approval_status = ContractArticle::APPROVAL_CONTRACTS_APPROVED;
            $article->contracts_manager_approved_at = now();
            $article->contracts_manager_approved_by = $actor->id;
            $article->save();

            $this->notifyPermission(
                'contract.library.approve_legal',
                'contract.article.contracts_approved',
                'Contract article pending legal approval',
                'Article '.$article->code.' was approved by contracts and awaits legal.',
                route('contract-articles.show', $article)
            );

            return $article->fresh();
        });
    }

    public function approveArticleLegal(ContractArticle $article, User $actor): ContractArticle
    {
        if (($article->approval_status ?? ContractArticle::APPROVAL_NONE) !== ContractArticle::APPROVAL_CONTRACTS_APPROVED) {
            throw new RuntimeException('Article is not awaiting legal approval.');
        }

        return DB::transaction(function () use ($article, $actor): ContractArticle {
            $article->approval_status = ContractArticle::APPROVAL_LEGAL_APPROVED;
            $article->legal_approved_at = now();
            $article->legal_approved_by = $actor->id;
            $article->rejection_reason = null;
            $article->status = ContractArticle::STATUS_ACTIVE;
            $article->save();

            return $article->fresh();
        });
    }

    public function rejectArticle(ContractArticle $article, User $actor, string $reason): ContractArticle
    {
        $status = $article->approval_status ?? ContractArticle::APPROVAL_NONE;
        if (! in_array($status, [ContractArticle::APPROVAL_SUBMITTED, ContractArticle::APPROVAL_CONTRACTS_APPROVED], true)) {
            throw new RuntimeException('Article cannot be rejected in its current approval state.');
        }

        return DB::transaction(function () use ($article, $actor, $reason): ContractArticle {
            $article->approval_status = ContractArticle::APPROVAL_REJECTED;
            $article->rejection_reason = $reason;
            $article->save();

            if ($article->submitted_by_user_id !== null) {
                $submitter = User::query()->find($article->submitted_by_user_id);
                if ($submitter !== null) {
                    $this->notificationService->notifyUser(
                        $submitter,
                        'contract.article.rejected',
                        'Contract article rejected',
                        'Article '.$article->code.' was rejected: '.$reason,
                        route('contract-articles.show', $article),
                        ['contract_article_id' => (string) $article->id]
                    );
                }
            }

            return $article->fresh();
        });
    }

    public function submitTemplate(ContractTemplate $template, User $actor): ContractTemplate
    {
        if (! $template->canBeSubmitted()) {
            throw new RuntimeException('Template cannot be submitted for approval in its current state.');
        }

        return DB::transaction(function () use ($template, $actor): ContractTemplate {
            $template->refresh();

            $wasRevision = $template->approval_status === ContractTemplate::APPROVAL_LEGAL_APPROVED
                && $template->status === ContractTemplate::STATUS_ACTIVE;

            $template->approval_status = ContractTemplate::APPROVAL_SUBMITTED;
            $template->submitted_at = now();
            $template->submitted_by_user_id = $actor->id;
            $template->rejection_reason = null;

            if ($wasRevision) {
                $template->contracts_manager_approved_at = null;
                $template->contracts_manager_approved_by = null;
                $template->legal_approved_at = null;
                $template->legal_approved_by = null;
            }

            $template->save();

            $this->notifyPermission(
                'contract.library.approve_contracts',
                'contract.template.submitted',
                'Contract template pending contracts approval',
                'Template '.$template->code.' was submitted for approval.',
                route('contract-templates.show', $template)
            );

            return $template->fresh();
        });
    }

    public function approveTemplateContracts(ContractTemplate $template, User $actor): ContractTemplate
    {
        if (($template->approval_status ?? ContractTemplate::APPROVAL_NONE) !== ContractTemplate::APPROVAL_SUBMITTED) {
            throw new RuntimeException('Template is not awaiting contracts manager approval.');
        }

        return DB::transaction(function () use ($template, $actor): ContractTemplate {
            $template->approval_status = ContractTemplate::APPROVAL_CONTRACTS_APPROVED;
            $template->contracts_manager_approved_at = now();
            $template->contracts_manager_approved_by = $actor->id;
            $template->save();

            $this->notifyPermission(
                'contract.library.approve_legal',
                'contract.template.contracts_approved',
                'Contract template pending legal approval',
                'Template '.$template->code.' was approved by contracts and awaits legal.',
                route('contract-templates.show', $template)
            );

            return $template->fresh();
        });
    }

    public function approveTemplateLegal(ContractTemplate $template, User $actor): ContractTemplate
    {
        if (($template->approval_status ?? ContractTemplate::APPROVAL_NONE) !== ContractTemplate::APPROVAL_CONTRACTS_APPROVED) {
            throw new RuntimeException('Template is not awaiting legal approval.');
        }

        return DB::transaction(function () use ($template, $actor): ContractTemplate {
            $template->load(['items']);
            $snapshot = $this->buildTemplateArticleSnapshot($template);

            $nextVersionNumber = $this->nextTemplateVersionNumber($template);

            $version = new ContractTemplateVersion();
            $version->fill([
                'contract_template_id' => $template->id,
                'version_number' => $nextVersionNumber,
                'name_en' => $template->name_en,
                'name_ar' => $template->name_ar,
                'description' => $template->description,
                'template_type' => $template->template_type,
                'status' => ContractTemplate::STATUS_ACTIVE,
                'internal_notes' => $template->internal_notes,
                'article_snapshot' => $snapshot,
                'created_by_user_id' => $actor->id,
            ]);
            $version->save();

            $template->approval_status = ContractTemplate::APPROVAL_LEGAL_APPROVED;
            $template->legal_approved_at = now();
            $template->legal_approved_by = $actor->id;
            $template->rejection_reason = null;
            $template->status = ContractTemplate::STATUS_ACTIVE;
            $template->current_template_version_id = $version->id;
            $template->save();

            return $template->fresh();
        });
    }

    public function rejectTemplate(ContractTemplate $template, User $actor, string $reason): ContractTemplate
    {
        $status = $template->approval_status ?? ContractTemplate::APPROVAL_NONE;
        if (! in_array($status, [ContractTemplate::APPROVAL_SUBMITTED, ContractTemplate::APPROVAL_CONTRACTS_APPROVED], true)) {
            throw new RuntimeException('Template cannot be rejected in its current approval state.');
        }

        return DB::transaction(function () use ($template, $actor, $reason): ContractTemplate {
            $template->approval_status = ContractTemplate::APPROVAL_REJECTED;
            $template->rejection_reason = $reason;
            $template->save();

            if ($template->submitted_by_user_id !== null) {
                $submitter = User::query()->find($template->submitted_by_user_id);
                if ($submitter !== null) {
                    $this->notificationService->notifyUser(
                        $submitter,
                        'contract.template.rejected',
                        'Contract template rejected',
                        'Template '.$template->code.' was rejected: '.$reason,
                        route('contract-templates.show', $template),
                        ['contract_template_id' => (string) $template->id]
                    );
                }
            }

            return $template->fresh();
        });
    }

    /**
     * Super-admin restore: apply a historical template version as a new immutable version + sync items.
     */
    public function restoreTemplateFromVersion(
        ContractTemplate $template,
        ContractTemplateVersion $version,
        User $actor
    ): ContractTemplate {
        if ($version->contract_template_id !== $template->id) {
            throw new RuntimeException('Version does not belong to this template.');
        }

        return DB::transaction(function () use ($template, $version, $actor): ContractTemplate {
            $template->refresh();

            $snapshot = $version->article_snapshot;
            if (! is_array($snapshot)) {
                throw new RuntimeException('Invalid article snapshot on template version.');
            }

            $orderedIds = [];
            foreach ($snapshot as $row) {
                if (is_array($row) && isset($row['contract_article_id'])) {
                    $orderedIds[] = (string) $row['contract_article_id'];
                }
            }

            $nextVersionNumber = $this->nextTemplateVersionNumber($template);

            $newVersion = new ContractTemplateVersion();
            $newVersion->fill([
                'contract_template_id' => $template->id,
                'version_number' => $nextVersionNumber,
                'name_en' => $version->name_en,
                'name_ar' => $version->name_ar,
                'description' => $version->description,
                'template_type' => $version->template_type,
                'status' => ContractTemplate::STATUS_DRAFT,
                'internal_notes' => $version->internal_notes,
                'article_snapshot' => $snapshot,
                'created_by_user_id' => $actor->id,
            ]);
            $newVersion->save();

            $updated = $this->templateService->updateTemplate(
                $template,
                [
                    'name_en' => $version->name_en,
                    'name_ar' => $version->name_ar,
                    'template_type' => $version->template_type,
                    'description' => $version->description,
                    'internal_notes' => $version->internal_notes,
                    'status' => ContractTemplate::STATUS_DRAFT,
                ],
                $orderedIds,
                $actor
            );

            $updated->approval_status = ContractTemplate::APPROVAL_NONE;
            $updated->submitted_at = null;
            $updated->submitted_by_user_id = null;
            $updated->contracts_manager_approved_at = null;
            $updated->contracts_manager_approved_by = null;
            $updated->legal_approved_at = null;
            $updated->legal_approved_by = null;
            $updated->rejection_reason = null;
            $updated->current_template_version_id = $newVersion->id;
            $updated->updated_by_user_id = $actor->id;
            $updated->save();

            return $updated->fresh();
        });
    }

    /**
     * @return array<int, array{contract_article_id: string, sort_order: int}>
     */
    public function buildTemplateArticleSnapshot(ContractTemplate $template): array
    {
        return $template->items()
            ->orderBy('sort_order')
            ->get()
            ->values()
            ->map(static function ($item, int $index): array {
                return [
                    'contract_article_id' => (string) $item->contract_article_id,
                    'sort_order' => $index + 1,
                ];
            })
            ->all();
    }

    private function nextTemplateVersionNumber(ContractTemplate $template): int
    {
        $max = $template->templateVersions()->max('version_number');

        return $max === null ? 1 : ((int) $max) + 1;
    }

    private function notifyPermission(
        string $permission,
        string $eventKey,
        string $title,
        string $message,
        string $link
    ): void {
        $users = User::permission($permission)->get();
        if ($users->isEmpty()) {
            return;
        }

        $this->notificationService->notifyUsers($users, $eventKey, $title, $message, $link);
    }
}
