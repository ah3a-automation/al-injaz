<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('contract_invoices')) {
            return;
        }

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION check_contract_invoice_overpayment()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_value DECIMAL(14,2);
  v_variation_delta DECIMAL(14,2);
  v_current_approved DECIMAL(14,2);
  v_max_allowed DECIMAL(14,2);
BEGIN
  IF NEW.status NOT IN ('approved', 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(c.contract_value, 0) INTO v_contract_value
  FROM contracts c WHERE c.id = NEW.contract_id;

  SELECT COALESCE(SUM(amount_delta), 0) INTO v_variation_delta
  FROM contract_variations
  WHERE contract_id = NEW.contract_id
  AND status IN ('approved', 'implemented');

  v_max_allowed := v_contract_value + v_variation_delta;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(net_amount), 0) INTO v_current_approved
    FROM contract_invoices
    WHERE contract_id = NEW.contract_id
    AND status IN ('approved', 'paid')
    AND id != OLD.id;
  ELSE
    SELECT COALESCE(SUM(net_amount), 0) INTO v_current_approved
    FROM contract_invoices
    WHERE contract_id = NEW.contract_id
    AND status IN ('approved', 'paid');
  END IF;

  IF (v_current_approved + NEW.net_amount) > v_max_allowed THEN
    RAISE EXCEPTION 
      'Invoice would exceed contract value. Approved total would be %, max allowed is %',
      v_current_approved + NEW.net_amount, v_max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL);

        DB::unprepared("
            DROP TRIGGER IF EXISTS trg_contract_invoice_overpayment ON contract_invoices;

            CREATE TRIGGER trg_contract_invoice_overpayment
            BEFORE INSERT OR UPDATE ON contract_invoices
            FOR EACH ROW
            EXECUTE FUNCTION check_contract_invoice_overpayment();
        ");
    }

    public function down(): void
    {
        if (!Schema::hasTable('contract_invoices')) {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_contract_invoice_overpayment ON contract_invoices;');
        DB::unprepared('DROP FUNCTION IF EXISTS check_contract_invoice_overpayment();');
    }
};