<?php

declare(strict_types=1);

namespace App\Application\Projects\Queries;

use App\Models\Project;

final class FindProjectQuery
{
    public function execute(string $id): Project
    {
        return Project::with(['owner:id,name'])->findOrFail($id);
    }
}
