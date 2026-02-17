ALTER TABLE `roles` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tenants` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `webhook_configs` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `workflow_definitions` ADD `deletedAt` timestamp;