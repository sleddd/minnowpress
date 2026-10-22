CREATE TABLE `login_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_requests_ip_idx` ON `login_requests` (`ip`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_requests_email_idx` ON `login_requests` (`email`,`created_at`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `signed_in_at` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_used_at` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_agent` text;--> statement-breakpoint
-- Sessions now end two days after sign-in, never extended. Cap sessions made under the old 30-day rule.
UPDATE `sessions` SET `signed_in_at` = `expires_at` - 2592000000 WHERE `signed_in_at` IS NULL;--> statement-breakpoint
UPDATE `sessions` SET `expires_at` = min(`expires_at`, `signed_in_at` + 172800000, (unixepoch() * 1000) + 172800000);
