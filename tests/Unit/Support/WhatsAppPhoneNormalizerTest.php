<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\WhatsAppPhoneNormalizer;
use PHPUnit\Framework\TestCase;

final class WhatsAppPhoneNormalizerTest extends TestCase
{
    public function test_normalizes_ksa_leading_zero(): void
    {
        $this->assertSame('966501234567', WhatsAppPhoneNormalizer::normalize('0501234567'));
    }

    public function test_normalizes_plus_966(): void
    {
        $this->assertSame('966501234567', WhatsAppPhoneNormalizer::normalize('+966501234567'));
    }

    public function test_normalizes_nine_digit_mobile(): void
    {
        $this->assertSame('966501234567', WhatsAppPhoneNormalizer::normalize('501234567'));
    }

    public function test_empty_returns_empty(): void
    {
        $this->assertSame('', WhatsAppPhoneNormalizer::normalize(''));
        $this->assertSame('', WhatsAppPhoneNormalizer::normalize('   '));
    }
}
