CREATE TABLE `ratings` (
	`user_id` integer NOT NULL,
	`story_id` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `story_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ratings_story_idx` ON `ratings` (`story_id`);--> statement-breakpoint
-- Carry existing likes over as 5-fish ratings.
INSERT INTO `ratings` (`user_id`, `story_id`, `score`, `created_at`, `updated_at`) SELECT `user_id`, `story_id`, 5, `created_at`, `created_at` FROM `likes`;--> statement-breakpoint
DROP TABLE `likes`;--> statement-breakpoint
ALTER TABLE `stories` ADD `ratings_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `ratings_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_ratings_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `archive_ratings_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `stories` SET `ratings_count` = (SELECT count(*) FROM `ratings` WHERE `ratings`.`story_id` = `stories`.`id`), `ratings_total` = (SELECT coalesce(sum(`score`), 0) FROM `ratings` WHERE `ratings`.`story_id` = `stories`.`id`);--> statement-breakpoint
ALTER TABLE `stories` DROP COLUMN `likes_count`;