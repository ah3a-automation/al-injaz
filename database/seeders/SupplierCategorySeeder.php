<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SupplierCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Final enterprise supplier category taxonomy.
 *
 * Design principles:
 * - One category per scope/package/system/material family.
 * - No duplication into supply/install/maintenance/etc.
 * - Vendor role is handled separately by supplier_type on the supplier.
 * - Categories are upserted by stable code.
 * - Missing categories are not deleted automatically.
 * - Levels are derived from tree depth.
 *
 * Intended use:
 * - Supplier registration
 * - Supplier filtering
 * - RFQ targeting
 * - Procurement analytics
 * - Prequalification and sourcing
 */
final class SupplierCategorySeeder extends Seeder
{
    /**
     * 16 L1 roots, 64 L2 branches, 200+ L3 leaves.
     *
     * @var array<int, array<string, mixed>>
     */
    private const TAXONOMY = [
        [
            'code' => 'CIV',
            'name_en' => 'Civil & Structural Works',
            'name_ar' => 'الأعمال المدنية والإنشائية',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'CON',
                    'name_en' => 'Concrete Works',
                    'name_ar' => 'أعمال الخرسانة',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'RMC', 'name_en' => 'Ready Mix Concrete', 'name_ar' => 'خرسانة جاهزة', 'supplier_type' => 'material_supplier'],
                        ['code' => 'PCC', 'name_en' => 'Precast Concrete', 'name_ar' => 'خرسانة مسبقة الصب', 'supplier_type' => 'manufacturer'],
                        ['code' => 'PSC', 'name_en' => 'Prestressed Concrete', 'name_ar' => 'خرسانة سابقة الإجهاد', 'supplier_type' => 'manufacturer'],
                        ['code' => 'SCT', 'name_en' => 'Shotcrete', 'name_ar' => 'خرسانة مقذوفة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'REP', 'name_en' => 'Concrete Repair', 'name_ar' => 'إصلاح الخرسانة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ADM', 'name_en' => 'Concrete Admixtures', 'name_ar' => 'إضافات الخرسانة', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'STL',
                    'name_en' => 'Rebar & Structural Steel',
                    'name_ar' => 'حديد التسليح والصلب الإنشائي',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'RBS', 'name_en' => 'Rebar Supply', 'name_ar' => 'توريد حديد التسليح', 'supplier_type' => 'material_supplier'],
                        ['code' => 'RBF', 'name_en' => 'Rebar Fabrication', 'name_ar' => 'تصنيع حديد التسليح', 'supplier_type' => 'manufacturer'],
                        ['code' => 'WMS', 'name_en' => 'Wire Mesh', 'name_ar' => 'شبك حديد', 'supplier_type' => 'material_supplier'],
                        ['code' => 'STS', 'name_en' => 'Structural Steel', 'name_ar' => 'حديد إنشائي', 'supplier_type' => 'material_supplier'],
                        ['code' => 'GAL', 'name_en' => 'Galvanization', 'name_ar' => 'الجلفنة', 'supplier_type' => 'manufacturer'],
                    ],
                ],
                [
                    'code' => 'FRM',
                    'name_en' => 'Formwork Systems',
                    'name_ar' => 'أنظمة الشدات والقوالب',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'ALS', 'name_en' => 'Aluminum Formwork', 'name_ar' => 'شدات ألمنيوم', 'supplier_type' => 'subcontractor'],
                        ['code' => 'TMS', 'name_en' => 'Timber Formwork', 'name_ar' => 'شدات خشبية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACC', 'name_en' => 'Formwork Accessories', 'name_ar' => 'إكسسوارات الشدات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'SHR', 'name_en' => 'Shoring Systems', 'name_ar' => 'أنظمة التدعيم', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'ERW',
                    'name_en' => 'Earthworks & Ground Engineering',
                    'name_ar' => 'أعمال الحفر والهندسة الأرضية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'EXC', 'name_en' => 'Excavation', 'name_ar' => 'أعمال الحفر', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ROK', 'name_en' => 'Rock Excavation', 'name_ar' => 'حفر الصخور', 'supplier_type' => 'subcontractor'],
                        ['code' => 'BKF', 'name_en' => 'Backfilling', 'name_ar' => 'الردم', 'supplier_type' => 'subcontractor'],
                        ['code' => 'CMP', 'name_en' => 'Compaction Works', 'name_ar' => 'أعمال الدمك', 'supplier_type' => 'subcontractor'],
                        ['code' => 'DEW', 'name_en' => 'Dewatering Systems', 'name_ar' => 'أنظمة نزح المياه', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SST', 'name_en' => 'Soil Stabilization', 'name_ar' => 'تثبيت التربة', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'FND',
                    'name_en' => 'Foundations & Deep Foundations',
                    'name_ar' => 'الأساسات والأساسات العميقة',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'PIL', 'name_en' => 'Piling Works', 'name_ar' => 'أعمال الخوازيق', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MCP', 'name_en' => 'Micro Piles', 'name_ar' => 'خوازيق دقيقة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SHP', 'name_en' => 'Sheet Piles', 'name_ar' => 'خوازيق صفائحية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ANC', 'name_en' => 'Foundation Anchors', 'name_ar' => 'مراسي الأساسات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'GRT', 'name_en' => 'Grouting Works', 'name_ar' => 'أعمال الحقن', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'ARC',
            'name_en' => 'Architectural & Finishes',
            'name_ar' => 'المعماري والتشطيبات',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'MAS',
                    'name_en' => 'Masonry & Wall Systems',
                    'name_ar' => 'المباني وأنظمة الجدران',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'CBL', 'name_en' => 'Concrete Blocks', 'name_ar' => 'بلوك خرساني', 'supplier_type' => 'material_supplier'],
                        ['code' => 'AAC', 'name_en' => 'AAC Blocks', 'name_ar' => 'بلوك AAC', 'supplier_type' => 'material_supplier'],
                        ['code' => 'NST', 'name_en' => 'Natural Stone', 'name_ar' => 'حجر طبيعي', 'supplier_type' => 'material_supplier'],
                        ['code' => 'AST', 'name_en' => 'Artificial Stone', 'name_ar' => 'حجر صناعي', 'supplier_type' => 'material_supplier'],
                        ['code' => 'INT', 'name_en' => 'Interlock Works', 'name_ar' => 'أعمال الإنترلوك', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'FIN',
                    'name_en' => 'Internal Finishes',
                    'name_ar' => 'التشطيبات الداخلية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'GYP', 'name_en' => 'Gypsum Works', 'name_ar' => 'أعمال الجبس', 'supplier_type' => 'subcontractor'],
                        ['code' => 'PAI', 'name_en' => 'Painting Works', 'name_ar' => 'أعمال الدهانات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'TIL', 'name_en' => 'Tile Installation', 'name_ar' => 'تركيب البلاط', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MAR', 'name_en' => 'Marble Works', 'name_ar' => 'أعمال الرخام', 'supplier_type' => 'subcontractor'],
                        ['code' => 'GRA', 'name_en' => 'Granite Works', 'name_ar' => 'أعمال الجرانيت', 'supplier_type' => 'subcontractor'],
                        ['code' => 'TRZ', 'name_en' => 'Terrazzo Works', 'name_ar' => 'أعمال التيرازو', 'supplier_type' => 'subcontractor'],
                        ['code' => 'RAF', 'name_en' => 'Raised Floors', 'name_ar' => 'الأرضيات المرتفعة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WCL', 'name_en' => 'Wall Cladding', 'name_ar' => 'تكسية الجدران', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'CEI',
                    'name_en' => 'Ceilings',
                    'name_ar' => 'الأسقف',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'GYC', 'name_en' => 'Gypsum Ceilings', 'name_ar' => 'أسقف جبسية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MTC', 'name_en' => 'Metal Ceilings', 'name_ar' => 'أسقف معدنية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACO', 'name_en' => 'Acoustic Ceilings', 'name_ar' => 'أسقف صوتية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WDC', 'name_en' => 'Wood Ceilings', 'name_ar' => 'أسقف خشبية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'DRW',
                    'name_en' => 'Doors & Windows',
                    'name_ar' => 'الأبواب والنوافذ',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'ALD', 'name_en' => 'Aluminum Doors', 'name_ar' => 'أبواب ألمنيوم', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ALW', 'name_en' => 'Aluminum Windows', 'name_ar' => 'نوافذ ألمنيوم', 'supplier_type' => 'subcontractor'],
                        ['code' => 'STD', 'name_en' => 'Steel Doors', 'name_ar' => 'أبواب معدنية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WOD', 'name_en' => 'Wooden Doors', 'name_ar' => 'أبواب خشبية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'AUT', 'name_en' => 'Automatic Doors', 'name_ar' => 'أبواب أوتوماتيكية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'FAC',
            'name_en' => 'Façade Systems',
            'name_ar' => 'أنظمة الواجهات',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'CWL',
                    'name_en' => 'Curtain Wall Systems',
                    'name_ar' => 'أنظمة الكرتن وول',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'UNI', 'name_en' => 'Unitized Curtain Wall', 'name_ar' => 'كرتن وول يونتايزد', 'supplier_type' => 'subcontractor'],
                        ['code' => 'STK', 'name_en' => 'Stick Curtain Wall', 'name_ar' => 'كرتن وول ستك', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACC', 'name_en' => 'Curtain Wall Accessories', 'name_ar' => 'إكسسوارات الكرتن وول', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'GLZ',
                    'name_en' => 'Glass Façades',
                    'name_ar' => 'واجهات زجاجية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'DGU', 'name_en' => 'Double Glazing Units', 'name_ar' => 'زجاج مزدوج', 'supplier_type' => 'manufacturer'],
                        ['code' => 'LAM', 'name_en' => 'Laminated Glass', 'name_ar' => 'زجاج مقسى ومصفح', 'supplier_type' => 'manufacturer'],
                        ['code' => 'SIL', 'name_en' => 'Structural Silicone Glazing', 'name_ar' => 'زجاج سيليكون إنشائي', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'CLD',
                    'name_en' => 'Cladding Systems',
                    'name_ar' => 'أنظمة التكسية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'ALC', 'name_en' => 'Aluminum Cladding', 'name_ar' => 'تكسية ألمنيوم', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MTC', 'name_en' => 'Metal Cladding', 'name_ar' => 'تكسية معدنية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'STC', 'name_en' => 'Stone Cladding', 'name_ar' => 'تكسية حجرية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'SPC',
                    'name_en' => 'Special Façade Elements',
                    'name_ar' => 'عناصر واجهات خاصة',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'SKY', 'name_en' => 'Skylights', 'name_ar' => 'سكاي لايت', 'supplier_type' => 'subcontractor'],
                        ['code' => 'LVR', 'name_en' => 'Louvers', 'name_ar' => 'لوفرات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SCR', 'name_en' => 'Façade Screens', 'name_ar' => 'شاشات واجهات', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'WAT',
            'name_en' => 'Waterproofing, Insulation & Protection',
            'name_ar' => 'العزل المائي والحراري والحماية',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'WPF',
                    'name_en' => 'Waterproofing Systems',
                    'name_ar' => 'أنظمة العزل المائي',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'BIT', 'name_en' => 'Bituminous Waterproofing', 'name_ar' => 'العزل البيتوميني', 'supplier_type' => 'subcontractor'],
                        ['code' => 'LQD', 'name_en' => 'Liquid Waterproofing', 'name_ar' => 'العزل السائل', 'supplier_type' => 'subcontractor'],
                        ['code' => 'CRY', 'name_en' => 'Crystalline Waterproofing', 'name_ar' => 'العزل البلوري', 'supplier_type' => 'subcontractor'],
                        ['code' => 'BSM', 'name_en' => 'Basement Waterproofing', 'name_ar' => 'عزل الأقبية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ROF', 'name_en' => 'Roof Waterproofing', 'name_ar' => 'عزل الأسطح', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'INS',
                    'name_en' => 'Insulation',
                    'name_ar' => 'العزل',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'THM', 'name_en' => 'Thermal Insulation', 'name_ar' => 'العزل الحراري', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SND', 'name_en' => 'Sound Insulation', 'name_ar' => 'العزل الصوتي', 'supplier_type' => 'subcontractor'],
                        ['code' => 'FRP', 'name_en' => 'Fireproofing', 'name_ar' => 'الحماية من الحريق', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ROC', 'name_en' => 'Rockwool Insulation', 'name_ar' => 'الصوف الصخري', 'supplier_type' => 'material_supplier'],
                        ['code' => 'POL', 'name_en' => 'Polystyrene Insulation', 'name_ar' => 'عازل بوليسترين', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'JNT',
                    'name_en' => 'Sealants & Joint Systems',
                    'name_ar' => 'أنظمة الفواصل ومواد السيلنت',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'SEA', 'name_en' => 'Sealants', 'name_ar' => 'سيلنت', 'supplier_type' => 'material_supplier'],
                        ['code' => 'JNT', 'name_en' => 'Expansion Joint Systems', 'name_ar' => 'أنظمة الفواصل', 'supplier_type' => 'subcontractor'],
                        ['code' => 'BKS', 'name_en' => 'Backing Rods & Accessories', 'name_ar' => 'إكسسوارات الفواصل', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'ROF',
                    'name_en' => 'Roof Systems',
                    'name_ar' => 'أنظمة الأسطح',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'MRS', 'name_en' => 'Metal Roofing', 'name_ar' => 'أسطح معدنية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'TIL', 'name_en' => 'Roof Tiles', 'name_ar' => 'بلاط الأسطح', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACC', 'name_en' => 'Roof Accessories', 'name_ar' => 'إكسسوارات الأسطح', 'supplier_type' => 'material_supplier'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'ELE',
            'name_en' => 'Electrical Systems',
            'name_ar' => 'الأنظمة الكهربائية',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'CAB',
                    'name_en' => 'Cables & Wiring',
                    'name_ar' => 'الكابلات والأسلاك',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'PWR', 'name_en' => 'Power Cables', 'name_ar' => 'كابلات القوى', 'supplier_type' => 'material_supplier'],
                        ['code' => 'CTL', 'name_en' => 'Control Cables', 'name_ar' => 'كابلات التحكم', 'supplier_type' => 'material_supplier'],
                        ['code' => 'DAT', 'name_en' => 'Data Cables', 'name_ar' => 'كابلات البيانات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'ACC', 'name_en' => 'Cable Accessories', 'name_ar' => 'إكسسوارات الكابلات', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'MGT',
                    'name_en' => 'Cable Management',
                    'name_ar' => 'حوامل وإدارة الكابلات',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'TRY', 'name_en' => 'Cable Trays', 'name_ar' => 'حوامل الكابلات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'LAD', 'name_en' => 'Cable Ladders', 'name_ar' => 'سلالم الكابلات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'TRK', 'name_en' => 'Cable Trunking', 'name_ar' => 'مجاري الكابلات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'CON', 'name_en' => 'Conduits', 'name_ar' => 'المواسير الكهربائية', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'PNL',
                    'name_en' => 'Panels & Switchgear',
                    'name_ar' => 'اللوحات والقواطع',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'LDB', 'name_en' => 'LV Distribution Boards', 'name_ar' => 'لوحات توزيع الجهد المنخفض', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MVS', 'name_en' => 'MV Switchgear', 'name_ar' => 'لوحات الجهد المتوسط', 'supplier_type' => 'subcontractor'],
                        ['code' => 'LVS', 'name_en' => 'LV Switchgear', 'name_ar' => 'لوحات الجهد المنخفض', 'supplier_type' => 'subcontractor'],
                        ['code' => 'RMU', 'name_en' => 'Ring Main Units', 'name_ar' => 'وحدات الحلقة الرئيسية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'TRF',
                    'name_en' => 'Transformers & Distribution',
                    'name_ar' => 'المحولات والتوزيع',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'TRN', 'name_en' => 'Transformers', 'name_ar' => 'محولات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'BUS', 'name_en' => 'Busway and Busduct', 'name_ar' => 'بسبار وباس دكت', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MTR', 'name_en' => 'Metering Systems', 'name_ar' => 'أنظمة القياس', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'MEP',
            'name_en' => 'Mechanical, Plumbing & HVAC',
            'name_ar' => 'الميكانيكا والصحي والتكييف',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'HVC',
                    'name_en' => 'HVAC Systems',
                    'name_ar' => 'أنظمة التكييف والتهوية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'CHL', 'name_en' => 'Chillers', 'name_ar' => 'شيلرات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'AHU', 'name_en' => 'AHU Units', 'name_ar' => 'وحدات مناولة الهواء', 'supplier_type' => 'subcontractor'],
                        ['code' => 'FCU', 'name_en' => 'FCU Units', 'name_ar' => 'وحدات FCU', 'supplier_type' => 'subcontractor'],
                        ['code' => 'DUC', 'name_en' => 'Duct Systems', 'name_ar' => 'أنظمة الدكت', 'supplier_type' => 'subcontractor'],
                        ['code' => 'VEN', 'name_en' => 'Ventilation Systems', 'name_ar' => 'أنظمة التهوية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'PIP',
                    'name_en' => 'Pipes, Fittings & Valves',
                    'name_ar' => 'المواسير والقطع والمحابس',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'GEN', 'name_en' => 'General Pipes and Fittings', 'name_ar' => 'مواسير وقطع عامة', 'supplier_type' => 'material_supplier'],
                        ['code' => 'PPR', 'name_en' => 'PPR Pipes', 'name_ar' => 'مواسير PPR', 'supplier_type' => 'material_supplier'],
                        ['code' => 'PVC', 'name_en' => 'PVC Pipes and Fittings', 'name_ar' => 'مواسير وقطع PVC', 'supplier_type' => 'material_supplier'],
                        ['code' => 'VAL', 'name_en' => 'Valves and Actuators', 'name_ar' => 'محابس ومشغلات', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'PLM',
                    'name_en' => 'Plumbing & Sanitary',
                    'name_ar' => 'الصحي والسباكة',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'SAN', 'name_en' => 'Sanitary Fixtures', 'name_ar' => 'الأدوات الصحية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WTS', 'name_en' => 'Water Treatment Systems', 'name_ar' => 'أنظمة معالجة المياه', 'supplier_type' => 'subcontractor'],
                        ['code' => 'CGS', 'name_en' => 'Central Gas Systems', 'name_ar' => 'أنظمة الغاز المركزي', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MHC', 'name_en' => 'Manhole Covers', 'name_ar' => 'أغطية المناهل', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'PMP',
                    'name_en' => 'Pumps & Vertical Transport',
                    'name_ar' => 'المضخات والنقل الرأسي',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'WTR', 'name_en' => 'Water Pumps', 'name_ar' => 'مضخات المياه', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ELV', 'name_en' => 'Elevators', 'name_ar' => 'مصاعد', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ESC', 'name_en' => 'Escalators', 'name_ar' => 'سلالم كهربائية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'FPS',
            'name_en' => 'Fire Protection & Life Safety',
            'name_ar' => 'مكافحة الحريق وسلامة الأرواح',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'SUP',
                    'name_en' => 'Fire Suppression Systems',
                    'name_ar' => 'أنظمة الإطفاء',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'SPR', 'name_en' => 'Sprinkler Systems', 'name_ar' => 'أنظمة الرش الآلي', 'supplier_type' => 'subcontractor'],
                        ['code' => 'FM2', 'name_en' => 'FM200 Systems', 'name_ar' => 'أنظمة FM200', 'supplier_type' => 'subcontractor'],
                        ['code' => 'NOV', 'name_en' => 'NOVEC Systems', 'name_ar' => 'أنظمة NOVEC', 'supplier_type' => 'subcontractor'],
                        ['code' => 'CO2', 'name_en' => 'CO2 Systems', 'name_ar' => 'أنظمة CO2', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'ALM',
                    'name_en' => 'Detection & Alarm',
                    'name_ar' => 'الإنذار والكشف',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'FAS', 'name_en' => 'Fire Alarm Systems', 'name_ar' => 'أنظمة إنذار الحريق', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SMK', 'name_en' => 'Smoke Detectors', 'name_ar' => 'كواشف الدخان', 'supplier_type' => 'material_supplier'],
                        ['code' => 'HEA', 'name_en' => 'Heat Detectors', 'name_ar' => 'كواشف الحرارة', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'SAF',
                    'name_en' => 'Safety Equipment',
                    'name_ar' => 'معدات السلامة',
                    'supplier_type' => 'material_supplier',
                    'children' => [
                        ['code' => 'PPE', 'name_en' => 'Personal Protective Equipment', 'name_ar' => 'معدات الوقاية الشخصية', 'supplier_type' => 'material_supplier'],
                        ['code' => 'FEX', 'name_en' => 'Fire Extinguishers', 'name_ar' => 'طفايات الحريق', 'supplier_type' => 'material_supplier'],
                        ['code' => 'GSM', 'name_en' => 'General Safety Materials', 'name_ar' => 'مواد السلامة العامة', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'TRN',
                    'name_en' => 'Training & Compliance',
                    'name_ar' => 'التدريب والامتثال',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'FAT', 'name_en' => 'First Aid Training', 'name_ar' => 'تدريب الإسعافات الأولية', 'supplier_type' => 'service_provider'],
                        ['code' => 'HSE', 'name_en' => 'HSE Training', 'name_ar' => 'تدريب السلامة', 'supplier_type' => 'service_provider'],
                        ['code' => 'AUD', 'name_en' => 'Safety Audits', 'name_ar' => 'تدقيق السلامة', 'supplier_type' => 'consultant'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'ELV',
            'name_en' => 'ELV, ICT & Smart Systems',
            'name_ar' => 'أنظمة التيار الخفيف والاتصالات والأنظمة الذكية',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'NET',
                    'name_en' => 'Data & Telecom Networks',
                    'name_ar' => 'شبكات البيانات والاتصالات',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'CAB', 'name_en' => 'Network Cabling', 'name_ar' => 'كابلات الشبكات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'TEL', 'name_en' => 'Telecommunication Stations', 'name_ar' => 'محطات الاتصالات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ISP', 'name_en' => 'Internet Services', 'name_ar' => 'خدمات الإنترنت', 'supplier_type' => 'service_provider'],
                    ],
                ],
                [
                    'code' => 'ACC',
                    'name_en' => 'CCTV & Access Control',
                    'name_ar' => 'كاميرات المراقبة والتحكم بالدخول',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'CCTV', 'name_en' => 'CCTV Systems', 'name_ar' => 'أنظمة CCTV', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACS', 'name_en' => 'Access Control Systems', 'name_ar' => 'أنظمة التحكم بالدخول', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ATR', 'name_en' => 'Attendance Devices', 'name_ar' => 'أجهزة الحضور والانصراف', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'PAV',
                    'name_en' => 'PA, Intercom & Audio Visual',
                    'name_ar' => 'أنظمة النداء العام والاتصال الداخلي والمرئي',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'PAI', 'name_en' => 'PA and Intercom Systems', 'name_ar' => 'أنظمة النداء والاتصال الداخلي', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SCR', 'name_en' => 'Screens and Projectors', 'name_ar' => 'الشاشات وأجهزة العرض', 'supplier_type' => 'subcontractor'],
                        ['code' => 'DSG', 'name_en' => 'Digital Signage', 'name_ar' => 'اللوحات الرقمية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'BMS',
                    'name_en' => 'BMS & Smart Building',
                    'name_ar' => 'إدارة المبنى والأنظمة الذكية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'BMS', 'name_en' => 'Building Management System', 'name_ar' => 'نظام إدارة المبنى', 'supplier_type' => 'subcontractor'],
                        ['code' => 'EMS', 'name_en' => 'Energy Management Systems', 'name_ar' => 'أنظمة إدارة الطاقة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SMT', 'name_en' => 'Smart Building Systems', 'name_ar' => 'أنظمة المباني الذكية', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'EXT',
            'name_en' => 'External Works & Infrastructure',
            'name_ar' => 'الأعمال الخارجية والبنية التحتية',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'LND',
                    'name_en' => 'Landscaping',
                    'name_ar' => 'تنسيق المواقع',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'SFT', 'name_en' => 'Softscaping and Planting', 'name_ar' => 'الزراعة والتشجير', 'supplier_type' => 'subcontractor'],
                        ['code' => 'HRD', 'name_en' => 'Hardscaping', 'name_ar' => 'الأعمال الصلبة الخارجية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'IRR', 'name_en' => 'Irrigation Systems', 'name_ar' => 'أنظمة الري', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'RDS',
                    'name_en' => 'Roads Infrastructure',
                    'name_ar' => 'البنية التحتية للطرق',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'ASP', 'name_en' => 'Asphalt Paving', 'name_ar' => 'رصف أسفلتي', 'supplier_type' => 'subcontractor'],
                        ['code' => 'CRB', 'name_en' => 'Concrete Road Barriers', 'name_ar' => 'حواجز طرق خرسانية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'RMS', 'name_en' => 'Road Marking and Signs', 'name_ar' => 'تخطيط وعلامات الطرق', 'supplier_type' => 'subcontractor'],
                        ['code' => 'SWD', 'name_en' => 'Storm Water Drainage', 'name_ar' => 'تصريف مياه الأمطار', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'FNC',
                    'name_en' => 'Fencing & Gates',
                    'name_ar' => 'الأسوار والبوابات',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'EXT', 'name_en' => 'External Fencing', 'name_ar' => 'أسوار خارجية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'VSG', 'name_en' => 'Vehicle and Security Gates', 'name_ar' => 'بوابات المركبات والأمن', 'supplier_type' => 'subcontractor'],
                        ['code' => 'PDG', 'name_en' => 'Pedestrian Gates', 'name_ar' => 'بوابات المشاة', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'SHD',
                    'name_en' => 'Shades & External Structures',
                    'name_ar' => 'المظلات والهياكل الخارجية',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'CAR', 'name_en' => 'Car Shades', 'name_ar' => 'مظلات سيارات', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WHS', 'name_en' => 'Prefab Warehouses and Hangars', 'name_ar' => 'هناجر ومستودعات جاهزة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'LVR', 'name_en' => 'Louvers and Screens', 'name_ar' => 'لوفرات وشاشات', 'supplier_type' => 'subcontractor'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'EQP',
            'name_en' => 'Equipment & Machinery',
            'name_ar' => 'المعدات والآليات',
            'supplier_type' => 'equipment_supplier',
            'children' => [
                [
                    'code' => 'HVY',
                    'name_en' => 'Heavy Equipment',
                    'name_ar' => 'المعدات الثقيلة',
                    'supplier_type' => 'equipment_supplier',
                    'children' => [
                        ['code' => 'TCR', 'name_en' => 'Tower Crane Rental', 'name_ar' => 'إيجار رافعات برجية', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'CRN', 'name_en' => 'Crane Rental', 'name_ar' => 'إيجار كرينات', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'EXB', 'name_en' => 'Excavators and Bulldozers', 'name_ar' => 'حفارات وجرافات', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'TRK', 'name_en' => 'Trucks and Haulage', 'name_ar' => 'شاحنات ونقليات', 'supplier_type' => 'equipment_supplier'],
                    ],
                ],
                [
                    'code' => 'LGT',
                    'name_en' => 'Light Equipment & Tools',
                    'name_ar' => 'المعدات الخفيفة والأدوات',
                    'supplier_type' => 'equipment_supplier',
                    'children' => [
                        ['code' => 'TLS', 'name_en' => 'Tools and Light Equipment', 'name_ar' => 'عدد وأدوات ومعدات خفيفة', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'PGN', 'name_en' => 'Portable Generators', 'name_ar' => 'مولدات محمولة', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'ACM', 'name_en' => 'Air Compressors', 'name_ar' => 'ضواغط هواء', 'supplier_type' => 'equipment_supplier'],
                    ],
                ],
                [
                    'code' => 'TMP',
                    'name_en' => 'Temporary Site Equipment',
                    'name_ar' => 'معدات المواقع المؤقتة',
                    'supplier_type' => 'equipment_supplier',
                    'children' => [
                        ['code' => 'OFC', 'name_en' => 'Prefab Site Offices', 'name_ar' => 'مكاتب موقع جاهزة', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'TLT', 'name_en' => 'Portable Toilets', 'name_ar' => 'دورات مياه متنقلة', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'WTK', 'name_en' => 'Water Tanks', 'name_ar' => 'خزانات مياه', 'supplier_type' => 'equipment_supplier'],
                    ],
                ],
                [
                    'code' => 'SPR',
                    'name_en' => 'Spare Parts & Maintenance',
                    'name_ar' => 'قطع الغيار والصيانة',
                    'supplier_type' => 'equipment_supplier',
                    'children' => [
                        ['code' => 'ESP', 'name_en' => 'Equipment Spare Parts', 'name_ar' => 'قطع غيار المعدات', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'OIL', 'name_en' => 'Oils and Lubricants', 'name_ar' => 'زيوت ومواد تشحيم', 'supplier_type' => 'material_supplier'],
                        ['code' => 'AFL', 'name_en' => 'Air Filters', 'name_ar' => 'فلاتر هواء', 'supplier_type' => 'material_supplier'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'ICT',
            'name_en' => 'Information Technology & Digital Services',
            'name_ar' => 'تقنية المعلومات والخدمات الرقمية',
            'supplier_type' => 'material_supplier',
            'children' => [
                [
                    'code' => 'HWR',
                    'name_en' => 'Hardware & Infrastructure',
                    'name_ar' => 'الأجهزة والبنية التحتية',
                    'supplier_type' => 'material_supplier',
                    'children' => [
                        ['code' => 'DCL', 'name_en' => 'Desktop Computers and Laptops', 'name_ar' => 'أجهزة الحاسب والمحمول', 'supplier_type' => 'material_supplier'],
                        ['code' => 'SRV', 'name_en' => 'Computer Servers', 'name_ar' => 'الخوادم', 'supplier_type' => 'material_supplier'],
                        ['code' => 'PRN', 'name_en' => 'Printers', 'name_ar' => 'الطابعات', 'supplier_type' => 'material_supplier'],
                        ['code' => 'DSP', 'name_en' => 'Projectors and Display Screens', 'name_ar' => 'أجهزة العرض والشاشات', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'SFT',
                    'name_en' => 'Software & Licenses',
                    'name_ar' => 'البرامج والتراخيص',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'CSL', 'name_en' => 'Computer Software and Licenses', 'name_ar' => 'برامج وتراخيص الحاسب', 'supplier_type' => 'service_provider'],
                        ['code' => 'WPS', 'name_en' => 'Website and Platform Subscriptions', 'name_ar' => 'اشتراكات المواقع والمنصات', 'supplier_type' => 'service_provider'],
                        ['code' => 'ERP', 'name_en' => 'ERP and Project Management Systems', 'name_ar' => 'أنظمة ERP وإدارة المشاريع', 'supplier_type' => 'service_provider'],
                    ],
                ],
                [
                    'code' => 'PRT',
                    'name_en' => 'Printing Supplies',
                    'name_ar' => 'مستلزمات الطباعة',
                    'supplier_type' => 'material_supplier',
                    'children' => [
                        ['code' => 'INK', 'name_en' => 'Ink and Toner Cartridges', 'name_ar' => 'أحبار وخراطيش', 'supplier_type' => 'material_supplier'],
                        ['code' => 'PPR', 'name_en' => 'Paper and Printing Supplies', 'name_ar' => 'ورق ومستلزمات طباعة', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'CON',
                    'name_en' => 'Connectivity',
                    'name_ar' => 'الاتصال والربط',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'INT', 'name_en' => 'Internet Services', 'name_ar' => 'خدمات الإنترنت', 'supplier_type' => 'service_provider'],
                        ['code' => 'TEL', 'name_en' => 'Telecom Services', 'name_ar' => 'خدمات الاتصالات', 'supplier_type' => 'service_provider'],
                        ['code' => 'CLD', 'name_en' => 'Cloud Services', 'name_ar' => 'الخدمات السحابية', 'supplier_type' => 'service_provider'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'SVC',
            'name_en' => 'Project Services & Professional Support',
            'name_ar' => 'خدمات المشروع والدعم المهني',
            'supplier_type' => 'service_provider',
            'children' => [
                [
                    'code' => 'ENG',
                    'name_en' => 'Engineering Consultancy',
                    'name_ar' => 'الاستشارات الهندسية',
                    'supplier_type' => 'consultant',
                    'children' => [
                        ['code' => 'GEN', 'name_en' => 'General Engineering Consultancy', 'name_ar' => 'استشارات هندسية عامة', 'supplier_type' => 'consultant'],
                        ['code' => 'SUR', 'name_en' => 'Surveying and Setting Out', 'name_ar' => 'المساحة وتحديد المواقع', 'supplier_type' => 'consultant'],
                        ['code' => 'TPI', 'name_en' => 'Third Party Testing and Inspection', 'name_ar' => 'اختبارات وفحص طرف ثالث', 'supplier_type' => 'consultant'],
                        ['code' => 'LED', 'name_en' => 'LEED and Sustainability Consultancy', 'name_ar' => 'استشارات LEED والاستدامة', 'supplier_type' => 'consultant'],
                        ['code' => 'LGL', 'name_en' => 'Legal and Contracts Advisory', 'name_ar' => 'استشارات قانونية وعقود', 'supplier_type' => 'consultant'],
                    ],
                ],
                [
                    'code' => 'LBR',
                    'name_en' => 'Labour & Manpower',
                    'name_ar' => 'العمالة والقوى العاملة',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'SKL', 'name_en' => 'Skilled Labour Hire', 'name_ar' => 'تأجير عمالة ماهرة', 'supplier_type' => 'service_provider'],
                        ['code' => 'UNS', 'name_en' => 'Unskilled Labour Hire', 'name_ar' => 'تأجير عمالة غير ماهرة', 'supplier_type' => 'service_provider'],
                        ['code' => 'UNI', 'name_en' => 'Uniforms and Workwear', 'name_ar' => 'الزي الموحد وملابس العمل', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'GOV',
                    'name_en' => 'Government Services',
                    'name_ar' => 'الخدمات الحكومية',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'PRM', 'name_en' => 'Government Services and Permits', 'name_ar' => 'الخدمات الحكومية والتصاريح', 'supplier_type' => 'service_provider'],
                        ['code' => 'ISO', 'name_en' => 'ISO Certification Services', 'name_ar' => 'خدمات شهادات الأيزو', 'supplier_type' => 'service_provider'],
                        ['code' => 'APP', 'name_en' => 'Government Approvals', 'name_ar' => 'الموافقات الحكومية', 'supplier_type' => 'service_provider'],
                    ],
                ],
                [
                    'code' => 'UTL',
                    'name_en' => 'Site Utilities',
                    'name_ar' => 'خدمات الموقع',
                    'supplier_type' => 'service_provider',
                    'children' => [
                        ['code' => 'WTR', 'name_en' => 'Drinking Water Supply', 'name_ar' => 'توريد مياه الشرب', 'supplier_type' => 'service_provider'],
                        ['code' => 'FUL', 'name_en' => 'Fuel and Lubricants', 'name_ar' => 'الوقود ومواد التشحيم', 'supplier_type' => 'service_provider'],
                        ['code' => 'WST', 'name_en' => 'Waste Containers and Cleaning', 'name_ar' => 'الحاويات والتنظيف', 'supplier_type' => 'service_provider'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'LAB',
            'name_en' => 'Testing, Laboratories & Quality',
            'name_ar' => 'الاختبارات والمعامل والجودة',
            'supplier_type' => 'consultant',
            'children' => [
                [
                    'code' => 'MAT',
                    'name_en' => 'Material Testing Laboratories',
                    'name_ar' => 'معامل اختبار المواد',
                    'supplier_type' => 'laboratory',
                    'children' => [
                        ['code' => 'CON', 'name_en' => 'Concrete Testing', 'name_ar' => 'اختبارات الخرسانة', 'supplier_type' => 'laboratory'],
                        ['code' => 'STL', 'name_en' => 'Steel Testing', 'name_ar' => 'اختبارات الحديد', 'supplier_type' => 'laboratory'],
                        ['code' => 'BLK', 'name_en' => 'Block and Masonry Testing', 'name_ar' => 'اختبارات البلوك والمباني', 'supplier_type' => 'laboratory'],
                    ],
                ],
                [
                    'code' => 'SOI',
                    'name_en' => 'Soil & Geotechnical',
                    'name_ar' => 'التربة والجيوتقنية',
                    'supplier_type' => 'laboratory',
                    'children' => [
                        ['code' => 'INV', 'name_en' => 'Soil Investigation', 'name_ar' => 'فحص ودراسة التربة', 'supplier_type' => 'laboratory'],
                        ['code' => 'GEO', 'name_en' => 'Geotechnical Testing', 'name_ar' => 'اختبارات جيوتقنية', 'supplier_type' => 'laboratory'],
                        ['code' => 'FND', 'name_en' => 'Foundation Testing', 'name_ar' => 'اختبارات الأساسات', 'supplier_type' => 'laboratory'],
                    ],
                ],
                [
                    'code' => 'NDT',
                    'name_en' => 'NDT & Structural Assessment',
                    'name_ar' => 'الفحوص غير الإتلافية وتقييم المنشآت',
                    'supplier_type' => 'laboratory',
                    'children' => [
                        ['code' => 'ULT', 'name_en' => 'Ultrasonic Testing', 'name_ar' => 'اختبار بالموجات فوق الصوتية', 'supplier_type' => 'laboratory'],
                        ['code' => 'RBD', 'name_en' => 'Rebound Hammer Testing', 'name_ar' => 'اختبار المطرقة الارتدادية', 'supplier_type' => 'laboratory'],
                        ['code' => 'STR', 'name_en' => 'Structural Assessment', 'name_ar' => 'تقييم إنشائي', 'supplier_type' => 'consultant'],
                    ],
                ],
                [
                    'code' => 'CAL',
                    'name_en' => 'Calibration Services',
                    'name_ar' => 'خدمات المعايرة',
                    'supplier_type' => 'laboratory',
                    'children' => [
                        ['code' => 'ELC', 'name_en' => 'Electrical Calibration', 'name_ar' => 'معايرة كهربائية', 'supplier_type' => 'laboratory'],
                        ['code' => 'MEC', 'name_en' => 'Mechanical Calibration', 'name_ar' => 'معايرة ميكانيكية', 'supplier_type' => 'laboratory'],
                        ['code' => 'INS', 'name_en' => 'Instrument Calibration', 'name_ar' => 'معايرة أجهزة', 'supplier_type' => 'laboratory'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'TMP',
            'name_en' => 'Temporary Works & Site Setup',
            'name_ar' => 'الأعمال المؤقتة وتجهيز الموقع',
            'supplier_type' => 'subcontractor',
            'children' => [
                [
                    'code' => 'SCA',
                    'name_en' => 'Scaffolding Systems',
                    'name_ar' => 'أنظمة السقالات',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'TUB', 'name_en' => 'Tube and Coupler Scaffolding', 'name_ar' => 'سقالات تيوب وكبلر', 'supplier_type' => 'subcontractor'],
                        ['code' => 'MOD', 'name_en' => 'Modular Scaffolding', 'name_ar' => 'سقالات معيارية', 'supplier_type' => 'subcontractor'],
                        ['code' => 'ACC', 'name_en' => 'Scaffolding Accessories', 'name_ar' => 'إكسسوارات السقالات', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'OFF',
                    'name_en' => 'Site Offices & Welfare',
                    'name_ar' => 'مكاتب الموقع والخدمات',
                    'supplier_type' => 'equipment_supplier',
                    'children' => [
                        ['code' => 'PBO', 'name_en' => 'Portable Site Offices', 'name_ar' => 'مكاتب موقع جاهزة', 'supplier_type' => 'equipment_supplier'],
                        ['code' => 'CMP', 'name_en' => 'Camp Facilities', 'name_ar' => 'مرافق السكن والمخيم', 'supplier_type' => 'service_provider'],
                        ['code' => 'FUR', 'name_en' => 'Site Furniture', 'name_ar' => 'أثاث الموقع', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'UTL',
                    'name_en' => 'Temporary Utilities',
                    'name_ar' => 'الخدمات المؤقتة',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'PWR', 'name_en' => 'Temporary Power', 'name_ar' => 'الكهرباء المؤقتة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'WTR', 'name_en' => 'Temporary Water', 'name_ar' => 'المياه المؤقتة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'LGT', 'name_en' => 'Temporary Lighting', 'name_ar' => 'الإنارة المؤقتة', 'supplier_type' => 'subcontractor'],
                    ],
                ],
                [
                    'code' => 'PRT',
                    'name_en' => 'Protection & Barriers',
                    'name_ar' => 'الحماية والحواجز',
                    'supplier_type' => 'subcontractor',
                    'children' => [
                        ['code' => 'FNC', 'name_en' => 'Temporary Fencing', 'name_ar' => 'الأسوار المؤقتة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'BAR', 'name_en' => 'Safety Barriers', 'name_ar' => 'حواجز السلامة', 'supplier_type' => 'subcontractor'],
                        ['code' => 'COV', 'name_en' => 'Protection Covers', 'name_ar' => 'أغطية الحماية', 'supplier_type' => 'material_supplier'],
                    ],
                ],
            ],
        ],
        [
            'code' => 'MIS',
            'name_en' => 'Miscellaneous / Controlled Exceptions',
            'name_ar' => 'متفرقات / حالات استثنائية',
            'supplier_type' => 'material_supplier',
            'children' => [
                [
                    'code' => 'FUR',
                    'name_en' => 'Furniture & Fittings',
                    'name_ar' => 'الأثاث والتجهيزات',
                    'supplier_type' => 'material_supplier',
                    'children' => [
                        ['code' => 'OFF', 'name_en' => 'Office Furniture', 'name_ar' => 'أثاث مكتبي', 'supplier_type' => 'material_supplier'],
                        ['code' => 'STF', 'name_en' => 'Site Furniture', 'name_ar' => 'أثاث الموقع', 'supplier_type' => 'material_supplier'],
                        ['code' => 'DEC', 'name_en' => 'Decor Items', 'name_ar' => 'عناصر ديكور', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'GEN',
                    'name_en' => 'General Materials',
                    'name_ar' => 'المواد العامة',
                    'supplier_type' => 'material_supplier',
                    'children' => [
                        ['code' => 'PLS', 'name_en' => 'Plastics and Mesh Materials', 'name_ar' => 'البلاستيكات والشباك', 'supplier_type' => 'material_supplier'],
                        ['code' => 'SCR', 'name_en' => 'Scrap Materials', 'name_ar' => 'مواد السكراب', 'supplier_type' => 'material_supplier'],
                        ['code' => 'MSC', 'name_en' => 'Miscellaneous Supplies', 'name_ar' => 'مواد متنوعة', 'supplier_type' => 'material_supplier'],
                    ],
                ],
                [
                    'code' => 'EXC',
                    'name_en' => 'Classification Review',
                    'name_ar' => 'مراجعة التصنيف',
                    'supplier_type' => 'consultant',
                    'children' => [
                        ['code' => 'TMP', 'name_en' => 'Temporary Exception Category', 'name_ar' => 'تصنيف استثنائي مؤقت', 'supplier_type' => 'service_provider'],
                        ['code' => 'REV', 'name_en' => 'Category Review Service', 'name_ar' => 'خدمة مراجعة التصنيف', 'supplier_type' => 'consultant'],
                    ],
                ],
            ],
        ],
    ];

    public function run(): void
    {
        foreach (self::TAXONOMY as $root) {
            $this->seedNode($root, null, 1);
        }
    }

    /**
     * @param array<string, mixed> $node
     */
    private function seedNode(array $node, ?string $parentId, int $level): SupplierCategory
    {
        $category = $this->upsert(
            $parentId,
            (string) $node['code'],
            (string) $node['name_en'],
            (string) $node['name_ar'],
            (string) $node['supplier_type'],
            $level,
        );

        $children = $node['children'] ?? [];

        if (is_array($children)) {
            foreach ($children as $child) {
                if (is_array($child)) {
                    $childCode = $level === 1
                        ? $node['code'] . '-' . $child['code']
                        : $node['code'] . '-' . $child['code'];

                    $childNode = $child;
                    $childNode['code'] = $childCode;

                    $this->seedNode($childNode, (string) $category->id, $level + 1);
                }
            }
        }

        return $category;
    }

    private function upsert(
        ?string $parentId,
        string $code,
        string $nameEn,
        string $nameAr,
        string $supplierType,
        int $level,
    ): SupplierCategory {
        $existing = SupplierCategory::query()->where('code', $code)->first();

        $data = [
            'parent_id' => $parentId,
            'name_en' => $nameEn,
            'name_ar' => $nameAr,
            'level' => $level,
            'supplier_type' => $supplierType,
            'is_active' => true,
            'is_legacy' => false,
        ];

        if ($existing !== null) {
            $existing->update($data);
            return $existing->fresh();
        }

        return SupplierCategory::query()->create([
            'id' => (string) Str::uuid(),
            'code' => $code,
            ...$data,
        ]);
    }
}