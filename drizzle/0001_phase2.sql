CREATE TABLE `bookmarks` (
	`user_id` integer NOT NULL,
	`story_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `story_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passkeys_user_idx` ON `passkeys` (`user_id`);--> statement-breakpoint
ALTER TABLE `challenges` ADD `archive_id` integer;--> statement-breakpoint
ALTER TABLE `challenges` ADD `archive_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_archive_idx` ON `challenges` (`archive_id`);--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_id` integer;--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_url` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_author` text;--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_author_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `stories_archive_idx` ON `stories` (`archive_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `notify_comments` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_continuations` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_digest` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_archive` integer DEFAULT false NOT NULL;