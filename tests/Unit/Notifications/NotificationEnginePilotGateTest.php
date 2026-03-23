<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Services\Notifications\NotificationEnginePilotGate;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotificationEnginePilotGateTest extends TestCase
{
    #[Test]
    public function pilot_includes_wildcard_detects_star_token(): void
    {
        $this->assertTrue(NotificationEnginePilotGate::pilotIncludesWildcard(['*']));
        $this->assertTrue(NotificationEnginePilotGate::pilotIncludesWildcard(['rfq.issued', '*']));
        $this->assertFalse(NotificationEnginePilotGate::pilotIncludesWildcard(['rfq.issued']));
        $this->assertFalse(NotificationEnginePilotGate::pilotIncludesWildcard([]));
    }

    #[Test]
    public function should_use_engine_returns_false_when_master_engine_disabled(): void
    {
        config()->set('notifications.notification_engine.enabled', false);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['*']);

        $gate = new NotificationEnginePilotGate();
        $this->assertFalse($gate->shouldUseEngine('any.event'));
    }

    #[Test]
    public function should_use_engine_returns_false_when_pilot_disabled(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', false);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['*']);

        $gate = new NotificationEnginePilotGate();
        $this->assertFalse($gate->shouldUseEngine('any.event'));
    }

    #[Test]
    public function wildcard_routes_all_events_when_engine_and_pilot_enabled(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['*']);

        $gate = new NotificationEnginePilotGate();
        $this->assertTrue($gate->shouldUseEngine('anything.random'));
        $this->assertTrue($gate->shouldUseEngine('supplier.registered'));
        $this->assertTrue($gate->shouldUseEngine('rfq.issued'));
    }

    #[Test]
    public function explicit_list_behavior_unchanged(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['rfq.issued', 'task.assigned']);

        $gate = new NotificationEnginePilotGate();
        $this->assertTrue($gate->shouldUseEngine('rfq.issued'));
        $this->assertTrue($gate->shouldUseEngine('task.assigned'));
        $this->assertFalse($gate->shouldUseEngine('other.event'));
    }
}
