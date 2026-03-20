<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Services\Contracts\ContractArticleVersionService;
use Illuminate\Database\Seeder;

class ContractArticlesSeeder extends Seeder
{
    public function run(): void
    {
        /** @var User|null $admin */
        $admin = User::query()->whereHas('roles', fn ($q) => $q->where('name', 'super_admin'))->first()
            ?? User::query()->first();

        if (! $admin) {
            return;
        }

        /** @var ContractArticleVersionService $service */
        $service = app(ContractArticleVersionService::class);

        $definitions = [
            [
                'code' => 'GEN-001',
                'serial' => 10,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Governing Law',
                'title_ar' => 'القانون الحاكم',
                'content_en' => "This Agreement shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia.",
                'content_ar' => "يخضع هذا العقد ويُفسَّر وفقًا لقوانين المملكة العربية السعودية.",
            ],
            [
                'code' => 'GEN-002',
                'serial' => 20,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Entire Agreement',
                'title_ar' => 'كامل الاتفاق',
                'content_en' => "This Agreement constitutes the entire agreement between the parties and supersedes all prior understandings relating to its subject matter.",
                'content_ar' => "يشكل هذا العقد كامل الاتفاق بين الأطراف ويلغي كل التفاهمات السابقة المتعلقة بموضوعه.",
            ],
            [
                'code' => 'GEN-003',
                'serial' => 30,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Confidentiality',
                'title_ar' => 'السرية',
                'content_en' => "Each party shall keep confidential all information disclosed by the other party in connection with this Agreement.",
                'content_ar' => "يتعهد كل طرف بالحفاظ على سرية جميع المعلومات التي يفصح عنها الطرف الآخر فيما يتعلق بهذا العقد.",
            ],
            [
                'code' => 'GEN-004',
                'serial' => 40,
                'category' => 'recommended',
                'status' => 'draft',
                'title_en' => 'Force Majeure',
                'title_ar' => 'القوة القاهرة',
                'content_en' => "Neither party shall be liable for any delay or failure to perform due to events beyond its reasonable control.",
                'content_ar' => "لا يتحمل أي طرف مسؤولية أي تأخير أو إخفاق في التنفيذ بسبب أحداث خارجة عن إرادته المعقولة.",
            ],
            [
                'code' => 'GEN-005',
                'serial' => 50,
                'category' => 'recommended',
                'status' => 'active',
                'title_en' => 'Notices',
                'title_ar' => 'الإشعارات',
                'content_en' => "All notices under this Agreement shall be in writing and delivered to the designated addresses of the parties.",
                'content_ar' => "يجب أن تكون جميع الإشعارات بموجب هذا العقد مكتوبة وترسل إلى العناوين المحددة للأطراف.",
            ],
            [
                'code' => 'PAY-001',
                'serial' => 60,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Payment Terms',
                'title_ar' => 'شروط الدفع',
                'content_en' => "Payments shall be made within thirty (30) days from the date of receipt of a valid invoice, subject to acceptance of the related works.",
                'content_ar' => "يتم السداد خلال ثلاثين (30) يومًا من تاريخ استلام فاتورة صحيحة، شريطة قبول الأعمال ذات الصلة.",
            ],
            [
                'code' => 'PAY-002',
                'serial' => 70,
                'category' => 'optional',
                'status' => 'draft',
                'title_en' => 'Advance Payment',
                'title_ar' => 'الدفع المقدم',
                'content_en' => "An advance payment may be made subject to the submission of an unconditional bank guarantee in a form acceptable to the Buyer.",
                'content_ar' => "يمكن سداد دفعة مقدمة شريطة تقديم ضمان بنكي غير مشروط بصيغة مقبولة لدى المشتري.",
            ],
            [
                'code' => 'HSE-001',
                'serial' => 80,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Health, Safety and Environment',
                'title_ar' => 'الصحة والسلامة والبيئة',
                'content_en' => "The Supplier shall comply with all applicable health, safety and environmental laws, regulations and site rules.",
                'content_ar' => "يلتزم المورد بجميع القوانين واللوائح والأنظمة المعمول بها المتعلقة بالصحة والسلامة والبيئة، إضافة إلى تعليمات الموقع.",
            ],
            [
                'code' => 'HSE-002',
                'serial' => 90,
                'category' => 'recommended',
                'status' => 'active',
                'title_en' => 'Personal Protective Equipment',
                'title_ar' => 'معدات الحماية الشخصية',
                'content_en' => "The Supplier shall ensure that all personnel use appropriate personal protective equipment at all times while on site.",
                'content_ar' => "يتعين على المورد التأكد من استخدام جميع الأفراد لمعدات الحماية الشخصية المناسبة في جميع الأوقات أثناء وجودهم في الموقع.",
            ],
            [
                'code' => 'IPR-001',
                'serial' => 100,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Intellectual Property',
                'title_ar' => 'حقوق الملكية الفكرية',
                'content_en' => "All intellectual property rights in deliverables created under this Agreement shall vest in the Buyer unless otherwise agreed in writing.",
                'content_ar' => "تؤول جميع حقوق الملكية الفكرية في المخرجات التي يتم إنشاؤها بموجب هذا العقد إلى المشتري ما لم يتم الاتفاق خطيًا على خلاف ذلك.",
            ],
            [
                'code' => 'IPR-002',
                'serial' => 110,
                'category' => 'optional',
                'status' => 'draft',
                'title_en' => 'License to Use Background IP',
                'title_ar' => 'ترخيص استخدام الملكية الفكرية الخلفية',
                'content_en' => "The Supplier grants the Buyer a non-exclusive license to use any background intellectual property strictly to the extent required to use the deliverables.",
                'content_ar' => "يمنح المورد للمشتري ترخيصًا غير حصري لاستخدام أي ملكية فكرية خلفية بالقدر اللازم فقط لاستخدام المخرجات.",
            ],
            [
                'code' => 'TERM-001',
                'serial' => 120,
                'category' => 'mandatory',
                'status' => 'active',
                'title_en' => 'Termination for Convenience',
                'title_ar' => 'الإنهاء لملاءمة المشتري',
                'content_en' => "The Buyer may terminate this Agreement for convenience by providing thirty (30) days written notice to the Supplier.",
                'content_ar' => "يجوز للمشتري إنهاء هذا العقد لملاءمته بموجب إشعار كتابي يوجَّه إلى المورد قبل ثلاثين (30) يومًا.",
            ],
        ];

        foreach ($definitions as $index => $def) {
            $article = $service->createArticleWithVersion(
                [
                    'code' => $def['code'],
                    'serial' => $def['serial'],
                    'category' => $def['category'],
                    'status' => $def['status'],
                    'internal_notes' => null,
                ],
                [
                    'title_ar' => $def['title_ar'],
                    'title_en' => $def['title_en'],
                    'content_ar' => $def['content_ar'],
                    'content_en' => $def['content_en'],
                    'change_summary' => 'Seeded version 1',
                ],
                $admin
            );

            // Add a simple second version for a subset to support compare/restore testing
            if ($index % 3 === 0) {
                $service->updateArticle(
                    $article,
                    [
                        'serial' => $def['serial'],
                        'category' => $def['category'],
                        'status' => $def['status'],
                        'internal_notes' => 'Updated wording (seed data only)',
                    ],
                    [
                        'content_en' => $def['content_en'] . "\n\nThis clause was refined as part of demonstration seed data.",
                        'change_summary' => 'Seeded version 2 with minor wording refinement',
                    ],
                    $admin
                );
            }
        }
    }
}

