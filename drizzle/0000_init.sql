CREATE TABLE `challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`prompt_text` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` integer,
	`approved_by` integer,
	`starts_at` integer,
	`ends_at` integer,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `challenges_status_starts_idx` ON `challenges` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_story_idx` ON `comments` (`story_id`);--> statement-breakpoint
CREATE TABLE `follows` (
	`follower_id` integer NOT NULL,
	`followee_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`follower_id`, `followee_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`user_id` integer NOT NULL,
	`story_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `story_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `likes_story_idx` ON `likes` (`story_id`);--> statement-breakpoint
CREATE TABLE `login_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` integer,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_mature` integer DEFAULT false NOT NULL,
	`parent_id` integer,
	`relation` text,
	`chain_id` integer,
	`challenge_id` integer,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`activity_score` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `stories_status_published_idx` ON `stories` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `stories_author_idx` ON `stories` (`author_id`);--> statement-breakpoint
CREATE INDEX `stories_parent_idx` ON `stories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `stories_chain_idx` ON `stories` (`chain_id`);--> statement-breakpoint
CREATE INDEX `stories_activity_idx` ON `stories` (`activity_score`);--> statement-breakpoint
CREATE TABLE `story_tags` (
	`story_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`story_id`, `tag_id`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `story_tags_tag_idx` ON `story_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`website` text,
	`avatar_url` text,
	`show_mature` integer DEFAULT false NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);