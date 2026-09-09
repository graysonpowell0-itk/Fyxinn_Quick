CREATE TABLE `issue_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_issue_photos_issue_id` ON `issue_photos` (`issue_id`);--> statement-breakpoint
CREATE TABLE `issue_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`status` text NOT NULL,
	`actor_name` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_issue_updates_issue_id` ON `issue_updates` (`issue_id`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`location` text NOT NULL,
	`location_type` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'unaddressed' NOT NULL,
	`reporter_name` text NOT NULL,
	`reporter_phone` text NOT NULL,
	`assignee_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_issues_location_updated` ON `issues` (`location`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_issues_open_status` ON `issues` (`status`);