<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\ContractArticle;
use App\Models\ContractTemplate;
use App\Models\ContractTemplateItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ContractTemplateService
{
    /**
     * Create a new contract template with ordered article items.
     *
     * @param array{
     *     code: string,
     *     name_en: string,
     *     name_ar: string,
     *     template_type: string,
     *     status: string,
     *     description?: string|null,
     *     internal_notes?: string|null,
     * } $data
     * @param array<int, string> $articleIds Ordered list of contract_article ids
     */
    public function createTemplate(
        array $data,
        array $articleIds,
        User $actor
    ): ContractTemplate {
        return DB::transaction(function () use ($data, $articleIds, $actor): ContractTemplate {
            $template = new ContractTemplate();
            $template->fill([
                'code' => $data['code'],
                'name_en' => $data['name_en'],
                'name_ar' => $data['name_ar'],
                'template_type' => $data['template_type'],
                'status' => $data['status'],
                'description' => $data['description'] ?? null,
                'internal_notes' => $data['internal_notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'updated_by_user_id' => $actor->id,
            ]);
            $template->save();

            $this->syncItems($template, $articleIds);

            return $template->load(['items.article.currentVersion']);
        });
    }

    /**
     * Update template metadata and optionally its article composition.
     *
     * @param array{
     *     name_en?: string,
     *     name_ar?: string,
     *     template_type?: string,
     *     status?: string,
     *     description?: string|null,
     *     internal_notes?: string|null,
     * } $metadata
     * @param array<int, string>|null $articleIds Ordered list of contract_article ids or null to leave unchanged
     */
    public function updateTemplate(
        ContractTemplate $template,
        array $metadata,
        ?array $articleIds,
        User $actor
    ): ContractTemplate {
        return DB::transaction(function () use ($template, $metadata, $articleIds, $actor): ContractTemplate {
            $template->fill([
                'name_en' => $metadata['name_en'] ?? $template->name_en,
                'name_ar' => $metadata['name_ar'] ?? $template->name_ar,
                'template_type' => $metadata['template_type'] ?? $template->template_type,
                'status' => $metadata['status'] ?? $template->status,
                'description' => $metadata['description'] ?? $template->description,
                'internal_notes' => $metadata['internal_notes'] ?? $template->internal_notes,
                'updated_by_user_id' => $actor->id,
            ]);
            $template->save();

            if ($articleIds !== null) {
                $this->syncItems($template, $articleIds);
            }

            return $template->load(['items.article.currentVersion']);
        });
    }

    /**
     * Synchronize template items to match the provided ordered article ids.
     *
     * @param array<int, string> $articleIds
     */
    public function syncItems(ContractTemplate $template, array $articleIds): void
    {
        /** @var Collection<int, ContractTemplateItem> $existingItems */
        $existingItems = $template->items()->get();

        $articleIds = array_values(array_unique($articleIds));

        // Remove items for articles that are no longer present
        $idsToKeep = $articleIds;
        $itemsToDelete = $existingItems->filter(
            static fn (ContractTemplateItem $item): bool => ! in_array($item->contract_article_id, $idsToKeep, true)
        );
        if ($itemsToDelete->isNotEmpty()) {
            ContractTemplateItem::whereKey($itemsToDelete->modelKeys())->delete();
        }

        // Ensure all referenced articles exist
        if (! empty($articleIds)) {
            /** @var array<string> $existingArticleIds */
            $existingArticleIds = ContractArticle::query()
                ->whereIn('id', $articleIds)
                ->pluck('id')
                ->all();

            $articleIds = array_values(
                array_filter(
                    $articleIds,
                    static fn (string $id): bool => in_array($id, $existingArticleIds, true)
                )
            );
        }

        // Rebuild ordering
        foreach ($articleIds as $index => $articleId) {
            /** @var ContractTemplateItem|null $item */
            $item = $existingItems->firstWhere('contract_article_id', $articleId);

            if (! $item) {
                $item = new ContractTemplateItem();
                $item->contract_template_id = $template->id;
                $item->contract_article_id = $articleId;
            }

            $item->sort_order = $index + 1;
            $item->save();
        }
    }
}

