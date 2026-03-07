<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('supplier_category_assignments');
        Schema::dropIfExists('supplier_documents');
        Schema::dropIfExists('supplier_contacts');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('supplier_categories');

        Schema::create('supplier_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('name_ar', 100)->nullable();
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->smallInteger('sort_order')->default(0);
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement('CREATE UNIQUE INDEX supplier_categories_name_unique ON supplier_categories (name)');
        DB::statement('CREATE UNIQUE INDEX supplier_categories_slug_unique ON supplier_categories (slug)');
        DB::statement('CREATE INDEX idx_supplier_categories_slug ON supplier_categories (slug)');
        DB::statement('CREATE INDEX idx_supplier_categories_active ON supplier_categories (is_active)');

        $now = now();
        DB::table('supplier_categories')->insert([
            ['id' => 1, 'name' => 'Civil Works', 'name_ar' => 'أعمال مدنية', 'slug' => 'civil-works', 'description' => null, 'is_active' => true, 'sort_order' => 1, 'created_at' => $now],
            ['id' => 2, 'name' => 'Structural Steel', 'name_ar' => 'هياكل معدنية', 'slug' => 'structural-steel', 'description' => null, 'is_active' => true, 'sort_order' => 2, 'created_at' => $now],
            ['id' => 3, 'name' => 'Electrical', 'name_ar' => 'كهربائي', 'slug' => 'electrical', 'description' => null, 'is_active' => true, 'sort_order' => 3, 'created_at' => $now],
            ['id' => 4, 'name' => 'Mechanical', 'name_ar' => 'ميكانيكي', 'slug' => 'mechanical', 'description' => null, 'is_active' => true, 'sort_order' => 4, 'created_at' => $now],
            ['id' => 5, 'name' => 'HVAC & Plumbing', 'name_ar' => 'تكييف وصحية', 'slug' => 'hvac-plumbing', 'description' => null, 'is_active' => true, 'sort_order' => 5, 'created_at' => $now],
            ['id' => 6, 'name' => 'Finishing & Interiors', 'name_ar' => 'تشطيبات وديكور', 'slug' => 'finishing-interiors', 'description' => null, 'is_active' => true, 'sort_order' => 6, 'created_at' => $now],
            ['id' => 7, 'name' => 'IT Systems', 'name_ar' => 'أنظمة تقنية', 'slug' => 'it-systems', 'description' => null, 'is_active' => true, 'sort_order' => 7, 'created_at' => $now],
            ['id' => 8, 'name' => 'Materials & Supplies', 'name_ar' => 'مواد وتوريدات', 'slug' => 'materials-supplies', 'description' => null, 'is_active' => true, 'sort_order' => 8, 'created_at' => $now],
            ['id' => 9, 'name' => 'Safety & Security', 'name_ar' => 'سلامة وأمن', 'slug' => 'safety-security', 'description' => null, 'is_active' => true, 'sort_order' => 9, 'created_at' => $now],
            ['id' => 10, 'name' => 'Landscaping', 'name_ar' => 'مساحات خضراء', 'slug' => 'landscaping', 'description' => null, 'is_active' => true, 'sort_order' => 10, 'created_at' => $now],
            ['id' => 11, 'name' => 'Surveying', 'name_ar' => 'مساحة وتخطيط', 'slug' => 'surveying', 'description' => null, 'is_active' => true, 'sort_order' => 11, 'created_at' => $now],
            ['id' => 12, 'name' => 'Consulting', 'name_ar' => 'استشارات', 'slug' => 'consulting', 'description' => null, 'is_active' => true, 'sort_order' => 12, 'created_at' => $now],
            ['id' => 13, 'name' => 'Other', 'name_ar' => 'أخرى', 'slug' => 'other', 'description' => null, 'is_active' => true, 'sort_order' => 13, 'created_at' => $now],
        ]);

        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('supplier_code', 20)->unique();
            $table->string('legal_name_en', 255);
            $table->string('legal_name_ar', 255)->nullable();
            $table->string('trade_name', 255)->nullable();
            $table->string('logo_path', 500)->nullable();
            $table->string('supplier_type', 30)->default('supplier');
            $table->string('country', 100);
            $table->string('city', 100);
            $table->string('postal_code', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 255)->nullable()->unique();
            $table->string('website', 255)->nullable();
            $table->string('status', 30)->default('pending_registration');
            $table->boolean('is_verified')->default(false);
            $table->string('compliance_status', 20)->default('pending');
            $table->string('commercial_registration_no', 100)->nullable()->unique();
            $table->date('cr_expiry_date')->nullable();
            $table->string('vat_number', 100)->nullable();
            $table->string('unified_number', 100)->nullable();
            $table->string('business_license_number', 100)->nullable();
            $table->date('license_expiry_date')->nullable();
            $table->string('chamber_of_commerce_number', 100)->nullable();
            $table->string('classification_grade', 50)->nullable();
            $table->string('bank_name', 255)->nullable();
            $table->string('bank_country', 100)->nullable();
            $table->string('bank_account_name', 255)->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->string('iban', 50)->nullable();
            $table->string('swift_code', 20)->nullable();
            $table->string('preferred_currency', 10)->nullable()->default('SAR');
            $table->smallInteger('payment_terms_days')->nullable();
            $table->decimal('credit_limit', 15, 2)->nullable();
            $table->decimal('tax_withholding_rate', 5, 2)->nullable();
            $table->string('financial_rating', 20)->nullable();
            $table->smallInteger('risk_score')->nullable();
            $table->text('notes')->nullable();
            $table->string('registration_token', 64)->nullable();
            $table->timestampTz('registration_token_expires_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('deleted_at')->nullable();
            $table->timestampsTz();
        });
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_type CHECK (supplier_type IN ('supplier','subcontractor','service_provider','consultant'))");
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_status CHECK (status IN ('pending_registration','under_review','approved','suspended','blacklisted'))");
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_compliance CHECK (compliance_status IN ('pending','verified','rejected'))");
        DB::statement('ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_payment_terms CHECK (payment_terms_days IN (30,60,90,120) OR payment_terms_days IS NULL)');
        DB::statement('ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_risk_score CHECK (risk_score BETWEEN 0 AND 100 OR risk_score IS NULL)');
        DB::statement('CREATE INDEX idx_suppliers_code ON suppliers (supplier_code)');
        DB::statement('CREATE INDEX idx_suppliers_status ON suppliers (status)');
        DB::statement('CREATE INDEX idx_suppliers_type ON suppliers (supplier_type)');
        DB::statement('CREATE INDEX idx_suppliers_email ON suppliers (email)');
        DB::statement('CREATE INDEX idx_suppliers_country ON suppliers (country)');
        DB::statement('CREATE INDEX idx_suppliers_token ON suppliers (registration_token)');
        DB::statement('CREATE INDEX idx_suppliers_cr ON suppliers (commercial_registration_no)');

        Schema::create('supplier_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('job_title', 255)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('contact_type', 20)->default('sales');
            $table->string('email', 255)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('mobile', 30)->nullable();
            $table->string('avatar_path', 500)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->text('notes')->nullable();
            $table->timestampTz('deleted_at')->nullable();
            $table->timestampsTz();
        });
        DB::statement("ALTER TABLE supplier_contacts ADD CONSTRAINT chk_supplier_contacts_type CHECK (contact_type IN ('sales','technical','finance','contracts','management'))");
        DB::statement('CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts (supplier_id)');
        DB::statement('CREATE INDEX idx_supplier_contacts_primary ON supplier_contacts (supplier_id, is_primary)');

        Schema::create('supplier_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_mandatory')->default(false);
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestampTz('deleted_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement("ALTER TABLE supplier_documents ADD CONSTRAINT chk_supplier_docs_type CHECK (document_type IN ('commercial_registration','unified_number','vat_certificate','business_license','national_address','bank_letter','company_profile','iso_certificate','other'))");
        DB::statement('CREATE INDEX idx_supplier_docs_supplier ON supplier_documents (supplier_id)');
        DB::statement('CREATE INDEX idx_supplier_docs_type ON supplier_documents (document_type)');
        DB::statement('CREATE INDEX idx_supplier_docs_expiry ON supplier_documents (supplier_id, expiry_date)');

        Schema::create('supplier_category_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('supplier_categories')->cascadeOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement('ALTER TABLE supplier_category_assignments ADD CONSTRAINT uq_supplier_category UNIQUE (supplier_id, category_id)');
        DB::statement('CREATE INDEX idx_sca_supplier ON supplier_category_assignments (supplier_id)');
        DB::statement('CREATE INDEX idx_sca_category ON supplier_category_assignments (category_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_category_assignments');
        Schema::dropIfExists('supplier_documents');
        Schema::dropIfExists('supplier_contacts');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('supplier_categories');
    }
};
