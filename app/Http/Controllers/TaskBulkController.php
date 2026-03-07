<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class TaskBulkController extends Controller
{
    public function destroy(Request $request): RedirectResponse
    {
        if (! $request->user()->can('tasks.delete')) {
            abort(403);
        }

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['uuid', 'exists:tasks,id'],
        ]);

        $ids = $request->input('ids', []);
        Task::query()->whereIn('id', $ids)->delete();

        return redirect()->route('tasks.index')->with('success', count($ids) . ' tasks deleted.');
    }
}
