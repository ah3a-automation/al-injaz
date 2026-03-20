<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ContractArticle;
use App\Models\User;
use App\Services\Contracts\ContractTemplateService;
use Illuminate\Database\Seeder;

class ContractTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        /** @var User|null $admin */
        $admin = User::query()
            ->whereHas('roles', static fn ($q) => $q->where('name', 'super_admin'))
            ->first() ?? User::query()->first();

        if (! $admin) {
            return;
        }

        /** @var ContractTemplateService $service */
        $service = app(ContractTemplateService::class);

        /** @var array<int, ContractArticle> $articles */
        $articles = ContractArticle::query()
            ->with('currentVersion')
            ->orderBy('serial')
            ->limit(12)
            ->get()
            ->all();

        if (count($articles) === 0) {
            return;
        }

        $groups = [
            [
                'code' => 'STD-SUPPLY',
                'name_en' => 'Standard supply contract',
                'name_ar' => 'عقد توريد قياسي',
                'template_type' => 'supply',
                'status' => 'draft',
            ],
            [
                'code' => 'STD-SUPPLY-INSTALL',
                'name_en' => 'Supply & install contract',
                'name_ar' => 'عقد توريد وتركيب',
                'template_type' => 'supply_install',
                'status' => 'draft',
            ],
            [
                'code' => 'STD-SUBCONTRACT',
                'name_en' => 'Standard subcontract agreement',
                'name_ar' => 'اتفاقية مقاولة باطن قياسية',
                'template_type' => 'subcontract',
                'status' => 'draft',
            ],
            [
                'code' => 'STD-SERVICE',
                'name_en' => 'Standard services contract',
                'name_ar' => 'عقد خدمات قياسي',
                'template_type' => 'service',
                'status' => 'draft',
            ],
            [
                'code' => 'STD-CONSULTANCY',
                'name_en' => 'Standard consultancy agreement',
                'name_ar' => 'اتفاقية استشارات قياسية',
                'template_type' => 'consultancy',
                'status' => 'draft',
            ],
        ];

        foreach ($groups as $index => $def) {
            $slice = array_slice($articles, $index * 3, 4);

            if (count($slice) === 0) {
                $slice = $articles;
            }

            $articleIds = array_map(
                static fn (ContractArticle $article): string => (string) $article->id,
                $slice
            );

            $service->createTemplate(
                [
                    'code' => $def['code'],
                    'name_en' => $def['name_en'],
                    'name_ar' => $def['name_ar'],
                    'template_type' => $def['template_type'],
                    'status' => $def['status'],
                    'description' => 'Seeded template for demonstration and testing.',
                    'internal_notes' => 'This template is created by ContractTemplatesSeeder for demo purposes.',
                ],
                $articleIds,
                $admin
            );
        }
    }
}

