CREATE TABLE `archive_authors` (
	`url` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`stories` integer NOT NULL,
	`first_published_at` integer,
	`last_published_at` integer
);
--> statement-breakpoint
CREATE INDEX `archive_authors_stories_idx` ON `archive_authors` (`stories`);--> statement-breakpoint
ALTER TABLE `stories` ADD `popularity` real GENERATED ALWAYS AS (case when ratings_count > 0 then (ratings_total + 17.5) * 1.0 / (ratings_count + 5) else 0 end) VIRTUAL;--> statement-breakpoint
CREATE INDEX `stories_popularity_idx` ON `stories` (`status`,`popularity`);--> statement-breakpoint
CREATE INDEX `stories_archive_author_idx` ON `stories` (`archive_author_url`,`status`,`published_at`);--> statement-breakpoint
ALTER TABLE `tags` ADD `published_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `general_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `tags_published_count_idx` ON `tags` (`published_count`);--> statement-breakpoint
CREATE INDEX `tags_general_count_idx` ON `tags` (`general_count`);--> statement-breakpoint
UPDATE `tags` SET `published_count` = c.published, `general_count` = c.general
	FROM (SELECT st.tag_id AS tag_id, count(*) AS published, sum(CASE WHEN s.is_mature = 0 THEN 1 ELSE 0 END) AS general
		FROM `story_tags` st JOIN `stories` s ON s.id = st.story_id WHERE s.status = 'published' GROUP BY st.tag_id) AS c
	WHERE c.tag_id = `tags`.id;--> statement-breakpoint
INSERT INTO `archive_authors` (`url`, `name`, `stories`, `first_published_at`, `last_published_at`)
	SELECT `archive_author_url`, coalesce(min(`archive_author`), 'Unknown'), count(*), min(`published_at`), max(`published_at`)
	FROM `stories` WHERE `archive_author_url` IS NOT NULL AND `status` = 'published' GROUP BY `archive_author_url`;--> statement-breakpoint
CREATE VIRTUAL TABLE `stories_fts` USING fts5(`title`, `body`, content='stories', content_rowid='id', tokenize='unicode61 remove_diacritics 2');--> statement-breakpoint
CREATE TRIGGER `stories_fts_insert` AFTER INSERT ON `stories` BEGIN
	INSERT INTO `stories_fts` (rowid, title, body) VALUES (new.id, new.title, new.body);
END;--> statement-breakpoint
CREATE TRIGGER `stories_fts_delete` AFTER DELETE ON `stories` BEGIN
	INSERT INTO `stories_fts` (`stories_fts`, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
END;--> statement-breakpoint
CREATE TRIGGER `stories_fts_update` AFTER UPDATE OF `title`, `body` ON `stories` BEGIN
	INSERT INTO `stories_fts` (`stories_fts`, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
	INSERT INTO `stories_fts` (rowid, title, body) VALUES (new.id, new.title, new.body);
END;--> statement-breakpoint
INSERT INTO `stories_fts` (`stories_fts`) VALUES ('rebuild');
--> statement-breakpoint
-- Planner statistics: without them SQLite walks every story for a tag or a search instead of
-- starting from the tag or the full-text index.
ANALYZE;
