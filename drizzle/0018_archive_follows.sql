CREATE TABLE `archive_follows` (
	`follower_id` integer NOT NULL,
	`author_url` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`follower_id`, `author_url`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
