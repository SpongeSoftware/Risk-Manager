CREATE TABLE `assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`title` text NOT NULL,
	`framework` text DEFAULT 'ISO27001' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`field_changed` text,
	`old_value` text,
	`new_value` text,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`supervisor_id` text NOT NULL,
	`comment` text NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`asset_name` text NOT NULL,
	`asset_category` text NOT NULL,
	`threat` text NOT NULL,
	`vulnerability` text NOT NULL,
	`likelihood` integer NOT NULL,
	`impact` integer NOT NULL,
	`risk_score` integer NOT NULL,
	`treatment` text NOT NULL,
	`controls` text,
	`residual_risk` integer,
	`soc2_criteria` text,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`period` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`member_role` text NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_unique` ON `team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`semester_id` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`workos_id` text,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`student_id` text,
	`role` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_date` text NOT NULL,
	`modified_by` text NOT NULL,
	`modified_date` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_workos_id_unique` ON `users` (`workos_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);