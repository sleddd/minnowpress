CREATE TABLE `moderation_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`report_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `moderation_log_created_idx` ON `moderation_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `search_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_requests_ip_idx` ON `search_requests` (`ip`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `former_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `username_changed_at` integer;--> statement-breakpoint
CREATE INDEX `users_former_username_idx` ON `users` (`former_username`);