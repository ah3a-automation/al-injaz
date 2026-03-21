<?php

declare(strict_types=1);

namespace Tests\Feature\Task;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class TaskModulePolishTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    private function userWithTaskViewEdit(): User
    {
        $pView = Permission::findOrCreate('tasks.view');
        $pEdit = Permission::findOrCreate('tasks.edit');
        $role = Role::findOrCreate('task-polish');
        $role->givePermissionTo([$pView->name, $pEdit->name]);
        $user = User::factory()->create();
        $user->assignRole($role->name);

        return $user;
    }

    #[Test]
    public function task_show_includes_history_from_activity_logs(): void
    {
        $owner = User::factory()->create();
        $task = Task::create([
            'id' => (string) Str::uuid(),
            'project_id' => null,
            'parent_task_id' => null,
            'created_by_user_id' => $owner->id,
            'title' => 'History Task',
            'description' => null,
            'status' => 'open',
            'priority' => 'normal',
            'due_at' => null,
            'start_at' => null,
            'completed_at' => null,
            'visibility' => 'team',
            'source' => 'manual',
            'position' => 0,
            'estimated_hours' => null,
            'actual_hours' => null,
            'progress_percent' => 0,
        ]);

        ActivityLog::create([
            'event' => 'tasks.task.created',
            'subject_type' => Task::class,
            'subject_id' => (string) $task->id,
            'causer_user_id' => $owner->id,
            'old_values' => null,
            'new_values' => null,
            'context' => null,
            'ip_address' => null,
            'user_agent' => null,
        ]);

        $actor = $this->userWithTaskViewEdit();

        $this->actingAs($actor)->get(route('tasks.show', $task->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('history', 1)
                ->where('history.0.action', 'tasks.task.created'));
    }

    #[Test]
    public function task_reorder_swaps_position_within_same_parent_and_status(): void
    {
        $owner = User::factory()->create();
        $a = Task::create([
            'id' => (string) Str::uuid(),
            'project_id' => null,
            'parent_task_id' => null,
            'created_by_user_id' => $owner->id,
            'title' => 'A',
            'description' => null,
            'status' => 'open',
            'priority' => 'normal',
            'due_at' => null,
            'start_at' => null,
            'completed_at' => null,
            'visibility' => 'team',
            'source' => 'manual',
            'position' => 0,
            'estimated_hours' => null,
            'actual_hours' => null,
            'progress_percent' => 0,
        ]);
        $b = Task::create([
            'id' => (string) Str::uuid(),
            'project_id' => null,
            'parent_task_id' => null,
            'created_by_user_id' => $owner->id,
            'title' => 'B',
            'description' => null,
            'status' => 'open',
            'priority' => 'normal',
            'due_at' => null,
            'start_at' => null,
            'completed_at' => null,
            'visibility' => 'team',
            'source' => 'manual',
            'position' => 1,
            'estimated_hours' => null,
            'actual_hours' => null,
            'progress_percent' => 0,
        ]);

        $actor = $this->userWithTaskViewEdit();

        $this->actingAs($actor)->post(route('tasks.reorder', $a->id), [
            'direction' => 'down',
        ])->assertRedirect();

        $a->refresh();
        $b->refresh();

        $this->assertSame(1, $a->position);
        $this->assertSame(0, $b->position);
    }

    #[Test]
    public function linkable_search_returns_matching_projects(): void
    {
        $owner = User::factory()->create();
        $project = Project::create([
            'id' => (string) Str::uuid(),
            'name' => 'UniqueAlphaSearchName',
            'description' => null,
            'status' => 'active',
            'owner_user_id' => $owner->id,
        ]);

        $actor = $this->userWithTaskViewEdit();

        $response = $this->actingAs($actor)->getJson(
            route('tasks.linkables.search', [
                'type' => 'project',
                'q' => 'UniqueAlpha',
            ])
        );

        $response->assertOk();
        $response->assertJsonPath('data.0.id', $project->id);
        $response->assertJsonPath('data.0.label', $project->name);
    }
}
