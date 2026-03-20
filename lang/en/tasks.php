<?php

declare(strict_types=1);

return [
    // Page titles
    'title_index'       => 'Tasks',
    'title_create'      => 'Create Task',
    'title_edit'        => 'Edit Task',
    'title_detail'      => 'Task Details',

    // Table columns
    'col_title'         => 'Title',
    'col_status'        => 'Status',
    'col_priority'      => 'Priority',
    'col_assignee'      => 'Assigned To',
    'col_due_date'      => 'Due Date',
    'col_project'       => 'Project',
    'col_created'       => 'Created',
    'col_actions'       => 'Actions',

    // Filters
    'filter_status'     => 'Filter by status',
    'filter_priority'   => 'Filter by priority',
    'filter_assignee'   => 'Filter by assignee',
    'all_statuses'      => 'All statuses',
    'all_priorities'    => 'All priorities',
    'all_assignees'     => 'All assignees',
    'search_placeholder'=> 'Search tasks...',

    // Status badges
    'status_open'           => 'Open',
    'status_in_progress'    => 'In Progress',
    'status_completed'      => 'Completed',
    'status_cancelled'      => 'Cancelled',
    'status_on_hold'        => 'On Hold',
    'status_overdue'        => 'Overdue',

    // Priority badges
    'priority_low'      => 'Low',
    'priority_medium'   => 'Medium',
    'priority_high'     => 'High',
    'priority_critical' => 'Critical',
    'priority_urgent'   => 'Urgent',
    'priority_normal'   => 'Normal',

    // Actions
    'action_create'     => 'Create Task',
    'action_edit'       => 'Edit',
    'action_delete'     => 'Delete',
    'action_complete'   => 'Mark Complete',
    'action_reopen'     => 'Reopen',
    'action_save'       => 'Save',
    'action_cancel'     => 'Cancel',
    'action_back'       => 'Back',
    'action_assign'     => 'Assign',
    'action_comment'    => 'Add Comment',

    // Form fields
    'field_title'       => 'Task Title',
    'field_description' => 'Description',
    'field_status'      => 'Status',
    'field_priority'    => 'Priority',
    'field_assignee'    => 'Assign To',
    'field_due_date'    => 'Due Date',
    'field_project'     => 'Related Project',
    'field_rfq'         => 'Related RFQ',
    'field_notes'       => 'Notes',
    'field_attachments' => 'Attachments',

    // Section headings
    'section_details'   => 'Task Details',
    'section_assignment'=> 'Assignment',
    'section_comments'  => 'Comments',
    'section_activity'  => 'Activity',
    'section_related'   => 'Related Items',

    // Comments
    'comment_placeholder' => 'Write a comment...',
    'comment_post'        => 'Post Comment',
    'no_comments'         => 'No comments yet',
    'comment_by'          => 'Comment by :name',
    'comment_at'          => ':date',

    // Modals
    'confirm_delete_title'  => 'Delete Task',
    'confirm_delete_body'   => 'Delete task ":title"? This cannot be undone.',
    'confirm_complete_title'=> 'Complete Task',
    'confirm_complete_body' => 'Mark ":title" as completed?',

    // Empty states
    'empty_title'       => 'No tasks found',
    'empty_body'        => 'No tasks match your current filters.',
    'empty_action'      => 'Create your first task',

    // Feedback
    'created'           => 'Task created successfully.',
    'updated'           => 'Task updated successfully.',
    'deleted'           => 'Task deleted successfully.',
    'completed'         => 'Task marked as complete.',
    'reopened'          => 'Task reopened.',
    'comment_added'     => 'Comment added.',

    // Due date helpers
    'due_today'         => 'Due today',
    'due_tomorrow'      => 'Due tomorrow',
    'overdue_by'        => '{1} Overdue by 1 day|[2,*] Overdue by :days days',
    'due_in'            => '{1} Due in 1 day|[2,*] Due in :days days',

    // Pagination
    'showing'           => 'Showing :from–:to of :total tasks',
];

