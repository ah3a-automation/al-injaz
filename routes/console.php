<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('suppliers:notify-document-expiry')->dailyAt('08:00');
Schedule::command('tasks:notify-due-soon-overdue')->dailyAt('08:15');
