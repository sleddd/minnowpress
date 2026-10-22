PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`website` text,
	`avatar_url` text,
	`show_mature` integer DEFAULT false NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`notify_comments` integer DEFAULT true NOT NULL,
	`notify_continuations` integer DEFAULT true NOT NULL,
	`notify_digest` integer DEFAULT false NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`is_archive` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "username", "display_name", "bio", "website", "avatar_url", "show_mature", "role", "notify_comments", "notify_continuations", "notify_digest", "theme", "is_archive", "created_at") SELECT "id", "email", "username", "display_name", "bio", "website", "avatar_url", "show_mature", "role", "notify_comments", "notify_continuations", "notify_digest", "theme", "is_archive", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
UPDATE `users` SET `theme` = 'light' WHERE `theme` = 'auto';
