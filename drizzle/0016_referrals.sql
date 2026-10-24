CREATE TABLE `referral_visits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `referral_visits_code_idx` ON `referral_visits` (`code`);--> statement-breakpoint
ALTER TABLE `users` ADD `referral_code` text;--> statement-breakpoint
CREATE INDEX `users_referral_code_idx` ON `users` (`referral_code`);