<?php

declare(strict_types=1);

use App\Models\Task;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('task_attachments')) {
            return;
        }

        $rows = DB::table('task_attachments')->get();

        foreach ($rows as $row) {
            $task = Task::query()->find($row->task_id);
            if ($task === null) {
                continue;
            }

            $path = ltrim((string) $row->file_path, '/');
            $fileName = (string) ($row->file_name ?: basename($path));

            $disks = ['public', 'local', 's3'];
            foreach ($disks as $disk) {
                if (! Storage::disk($disk)->exists($path)) {
                    continue;
                }
                try {
                    $task->addMediaFromDisk($path, $disk)
                        ->usingName(pathinfo($fileName, PATHINFO_FILENAME))
                        ->usingFileName($fileName)
                        ->toMediaCollection('task_files');
                    break;
                } catch (\Throwable $e) {
                    logger()->warning('migrate_task_attachments_to_media: skipped row', [
                        'task_attachment_id' => $row->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        Schema::dropIfExists('task_attachments');
    }

    public function down(): void
    {
        Schema::create('task_attachments', function (\Illuminate\Database\Schema\Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });
    }
};
