CREATE TABLE `blog_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`author_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `blog_posts_status_published_idx` ON `blog_posts` (`status`,`published_at`);