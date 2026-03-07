<?php

declare(strict_types=1);

namespace App\Domain\Shared\Contracts;

interface SearchableEntity
{
    /**
     * @return array{
     *   type: string,
     *   title: string,
     *   subtitle?: string,
     *   route: string,
     *   icon?: string
     * }
     */
    public function toSearchResult(): array;

    public static function searchLabel(): string;

    public static function searchRoute(): string;
}
