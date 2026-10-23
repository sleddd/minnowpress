DROP INDEX `stories_author_idx`;--> statement-breakpoint
DROP INDEX `stories_challenge_idx`;--> statement-breakpoint
CREATE INDEX `stories_author_idx` ON `stories` (`author_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `stories_challenge_idx` ON `stories` (`challenge_id`,`status`,`published_at`);--> statement-breakpoint
ANALYZE;
