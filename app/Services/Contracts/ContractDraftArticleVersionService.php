<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractDraftArticle;
use App\Models\ContractDraftArticleVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ContractDraftArticleVersionService
{
    /**
     * @param array<string, mixed> $data
     * @return array{0: ContractDraftArticleVersion|null, 1: ContractDraftArticle}
     */
    public function updateDraftArticleWithVersioning(
        Contract $contract,
        ContractDraftArticle $draftArticle,
        array $data,
        User $actor,
        ?string $changeSummary = null
    ): array {
        if ($draftArticle->contract_id !== $contract->id) {
            throw new RuntimeException('Draft article does not belong to this contract.');
        }

        return DB::transaction(function () use ($draftArticle, $data, $actor, $changeSummary): array {
            $original = $draftArticle->only(['title_en', 'title_ar', 'content_en', 'content_ar']);

            $draftArticle->fill([
                'title_en' => $data['title_en'] ?? $draftArticle->title_en,
                'title_ar' => $data['title_ar'] ?? $draftArticle->title_ar,
                'content_en' => $data['content_en'] ?? $draftArticle->content_en,
                'content_ar' => $data['content_ar'] ?? $draftArticle->content_ar,
            ]);

            $changed =
                $draftArticle->title_en !== $original['title_en']
                || $draftArticle->title_ar !== $original['title_ar']
                || $draftArticle->content_en !== $original['content_en']
                || $draftArticle->content_ar !== $original['content_ar'];

            if (! $changed) {
                return [null, $draftArticle];
            }

            $version = $this->createSnapshotVersion(
                $draftArticle,
                $actor,
                $changeSummary,
            );

            $draftArticle->is_modified = true;
            $draftArticle->updated_by_user_id = $actor->id;
            $draftArticle->last_edited_at = now();
            $draftArticle->save();

            return [$version, $draftArticle];
        });
    }

    public function restoreVersion(
        Contract $contract,
        ContractDraftArticle $draftArticle,
        ContractDraftArticleVersion $version,
        User $actor,
        ?string $changeSummary = null
    ): ContractDraftArticle {
        if ($draftArticle->contract_id !== $contract->id) {
            throw new RuntimeException('Draft article does not belong to this contract.');
        }

        if ($version->contract_draft_article_id !== $draftArticle->id) {
            throw new RuntimeException('Version does not belong to this draft article.');
        }

        return DB::transaction(function () use ($draftArticle, $version, $actor, $changeSummary): ContractDraftArticle {
            // Snapshot current live state before restore
            $this->createSnapshotVersion(
                $draftArticle,
                $actor,
                $changeSummary,
            );

            $draftArticle->title_en = $version->title_en;
            $draftArticle->title_ar = $version->title_ar;
            $draftArticle->content_en = $version->content_en;
            $draftArticle->content_ar = $version->content_ar;
            $draftArticle->is_modified = true;
            $draftArticle->updated_by_user_id = $actor->id;
            $draftArticle->last_edited_at = now();
            $draftArticle->save();

            return $draftArticle;
        });
    }

    private function createSnapshotVersion(
        ContractDraftArticle $draftArticle,
        User $actor,
        ?string $changeSummary
    ): ContractDraftArticleVersion {
        $nextNumber = $this->nextVersionNumber($draftArticle);

        $version = new ContractDraftArticleVersion();
        $version->fill([
            'contract_draft_article_id' => $draftArticle->id,
            'version_number' => $nextNumber,
            'title_en' => $draftArticle->title_en,
            'title_ar' => $draftArticle->title_ar,
            'content_en' => $draftArticle->content_en,
            'content_ar' => $draftArticle->content_ar,
            'change_summary' => $changeSummary,
            'changed_by_user_id' => $actor->id,
        ]);
        $version->save();

        return $version;
    }

    public function nextVersionNumber(ContractDraftArticle $draftArticle): int
    {
        /** @var int|null $max */
        $max = $draftArticle->versions()->max('version_number');

        return $max ? $max + 1 : 1;
    }
}

