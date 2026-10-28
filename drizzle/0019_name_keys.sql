CREATE TABLE `archive_names` (
	`key` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `display_name_key` text;--> statement-breakpoint
CREATE INDEX `users_username_key_idx` ON `users` (`username_key`);--> statement-breakpoint
CREATE INDEX `users_display_name_key_idx` ON `users` (`display_name_key`);