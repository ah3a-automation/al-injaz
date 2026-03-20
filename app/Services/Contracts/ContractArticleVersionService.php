<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\ContractArticle;
use App\Models\ContractArticleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ContractArticleVersionService
{
    /**
     * Create a new contract article together with its initial version (version_number = 1).
     *
     * @param array{
     *     code: string,
     *     serial: int,
     *     category: string,
     *     status?: string,
     *     internal_notes?: string|null,
     * } $articleData
     * @param array{
     *     title_ar: string,
     *     title_en: string,
     *     content_ar: string,
     *     content_en: string,
     *     change_summary?: string|null,
     * } $contentData
     */
    public function createArticleWithVersion(
        array $articleData,
        array $contentData,
        User $actor
    ): ContractArticle {
        $article = new ContractArticle();
        $article->fill([
            'code' => $articleData['code'],
            'serial' => $articleData['serial'],
            'category' => $articleData['category'],
            'status' => $articleData['status'] ?? ContractArticle::STATUS_DRAFT,
            'internal_notes' => $articleData['internal_notes'] ?? null,
            'created_by_user_id' => $actor->id,
            'updated_by_user_id' => $actor->id,
        ]);
        $article->save();

        $version = new ContractArticleVersion();
        $version->fill([
            'contract_article_id' => $article->id,
            'version_number' => 1,
            'title_ar' => $contentData['title_ar'],
            'title_en' => $contentData['title_en'],
            'content_ar' => $contentData['content_ar'],
            'content_en' => $contentData['content_en'],
            'change_summary' => $contentData['change_summary'] ?? null,
            'changed_by_user_id' => $actor->id,
        ]);
        $version->save();

        $article->current_version_id = $version->id;
        $article->save();

        return $article->setRelation(
            'currentVersion',
            $version
        );
    }

    /**
     * Update an article's metadata and optionally its content.
     *
     * - If only metadata changes, update the article without creating a new version.
     * - If any bilingual content field changes, create a new version with next version_number.
     *
     * @param array{
     *     serial?: int,
     *     category?: string,
     *     status?: string,
     *     internal_notes?: string|null,
     * } $metadata
     * @param array{
     *     title_ar?: string,
     *     title_en?: string,
     *     content_ar?: string,
     *     content_en?: string,
     *     change_summary?: string|null,
     * } $content
     */
    public function updateArticle(
        ContractArticle $article,
        array $metadata,
        array $content,
        User $actor
    ): ContractArticle {
        $article->fill([
            'serial' => $metadata['serial'] ?? $article->serial,
            'category' => $metadata['category'] ?? $article->category,
            'status' => $metadata['status'] ?? $article->status,
            'internal_notes' => $metadata['internal_notes'] ?? $article->internal_notes,
            'updated_by_user_id' => $actor->id,
        ]);

        /** @var ContractArticleVersion|null $currentVersion */
        $currentVersion = $article->currentVersion ?? $article->versions()->orderByDesc('version_number')->first();

        $hasContentChange = $this->hasContentChanged($currentVersion, $content);

        $article->save();

        if (! $hasContentChange || $currentVersion === null) {
            return $article->setRelation('currentVersion', $currentVersion);
        }

        $nextVersionNumber = $this->nextVersionNumber($article);

        $version = new ContractArticleVersion();
        $version->fill([
            'contract_article_id' => $article->id,
            'version_number' => $nextVersionNumber,
            'title_ar' => $content['title_ar'] ?? $currentVersion->title_ar,
            'title_en' => $content['title_en'] ?? $currentVersion->title_en,
            'content_ar' => $content['content_ar'] ?? $currentVersion->content_ar,
            'content_en' => $content['content_en'] ?? $currentVersion->content_en,
            'change_summary' => $content['change_summary'] ?? null,
            'changed_by_user_id' => $actor->id,
        ]);
        $version->save();

        $article->current_version_id = $version->id;
        $article->save();

        return $article->setRelation('currentVersion', $version);
    }

    /**
     * Restore a previous version by creating a new version snapshot.
     *
     * The selected version must belong to the provided article.
     */
    public function restoreVersion(
        ContractArticle $article,
        ContractArticleVersion $versionToRestore,
        User $actor,
        ?string $changeSummary = null
    ): ContractArticleVersion {
        if ($versionToRestore->contract_article_id !== $article->id) {
            throw new ModelNotFoundException('Version does not belong to the given contract article.');
        }

        $nextVersionNumber = $this->nextVersionNumber($article);

        $newVersion = new ContractArticleVersion();
        $newVersion->fill([
            'contract_article_id' => $article->id,
            'version_number' => $nextVersionNumber,
            'title_ar' => $versionToRestore->title_ar,
            'title_en' => $versionToRestore->title_en,
            'content_ar' => $versionToRestore->content_ar,
            'content_en' => $versionToRestore->content_en,
            'change_summary' => $changeSummary ?? sprintf(
                'Restored from version %d',
                $versionToRestore->version_number
            ),
            'changed_by_user_id' => $actor->id,
        ]);
        $newVersion->save();

        $article->current_version_id = $newVersion->id;
        $article->updated_by_user_id = $actor->id;
        $article->save();

        return $newVersion;
    }

    /**
     * Determine if any content field has changed compared to the current version.
     *
     * @param array{
     *     title_ar?: string,
     *     title_en?: string,
     *     content_ar?: string,
     *     content_en?: string,
     * } $content
     */
    private function hasContentChanged(
        ?ContractArticleVersion $currentVersion,
        array $content
    ): bool {
        if ($currentVersion === null) {
            return true;
        }

        $fields = ['title_ar', 'title_en', 'content_ar', 'content_en'];

        foreach ($fields as $field) {
            if (array_key_exists($field, $content) && $content[$field] !== $currentVersion->{$field}) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the next version number for the given article.
     */
    private function nextVersionNumber(ContractArticle $article): int
    {
        /** @var int|null $max */
        $max = $article->versions()->max('version_number');

        if ($max === null) {
            return 1;
        }

        return ((int) $max) + 1;
    }
}

