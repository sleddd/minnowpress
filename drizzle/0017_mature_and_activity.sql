ALTER TABLE `stories` ADD `mature_locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `adult_confirmed_at` integer;--> statement-breakpoint
CREATE INDEX `ratings_user_updated_idx` ON `ratings` (`user_id`,`updated_at`);