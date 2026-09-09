CREATE TABLE `repair_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`object_key` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `repair_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_repair_photos_submission` ON `repair_photos` (`submission_id`);--> statement-breakpoint
CREATE TABLE `repair_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`comment` text NOT NULL,
	`submitted_by` text NOT NULL,
	`submitted_at` text NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` text,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_repair_submissions_issue` ON `repair_submissions` (`issue_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `approval_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `issues` ADD `latest_submission_id` text;