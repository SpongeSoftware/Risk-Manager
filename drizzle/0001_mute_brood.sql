CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `invite_token_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `invite_token_expires_at` text;--> statement-breakpoint
CREATE INDEX `assessments_team_id_idx` ON `assessments` (`team_id`);--> statement-breakpoint
CREATE INDEX `feedback_assessment_id_idx` ON `feedback` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `risk_items_assessment_id_idx` ON `risk_items` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `team_members_user_id_idx` ON `team_members` (`user_id`);