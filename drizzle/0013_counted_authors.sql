DROP INDEX `story_tags_tag_idx`;--> statement-breakpoint
CREATE INDEX `story_tags_tag_idx` ON `story_tags` (`tag_id`,`story_id`);--> statement-breakpoint
DROP INDEX `tags_published_count_idx`;--> statement-breakpoint
DROP INDEX `tags_general_count_idx`;--> statement-breakpoint
CREATE INDEX `tags_published_count_idx` ON `tags` ("published_count" desc,`name`);--> statement-breakpoint
CREATE INDEX `tags_general_count_idx` ON `tags` ("general_count" desc,`name`);--> statement-breakpoint
ALTER TABLE `archive_authors` ADD `name_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `archive_authors_name_key_idx` ON `archive_authors` (`name_key`);--> statement-breakpoint
ALTER TABLE `users` ADD `published_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `users_published_count_idx` ON `users` (`is_archive`,`published_count`);--> statement-breakpoint
UPDATE `users` SET `published_count` = (SELECT count(*) FROM `stories` s WHERE s.author_id = `users`.id AND s.status = 'published');--> statement-breakpoint
UPDATE `archive_authors` SET `name_key` = lower(`name`);--> statement-breakpoint
ANALYZE;
