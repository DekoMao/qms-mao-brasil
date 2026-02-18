ALTER TABLE `defects` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `activeTenantId` int;--> statement-breakpoint
CREATE INDEX `idx_defects_tenant_id` ON `defects` (`tenantId`);