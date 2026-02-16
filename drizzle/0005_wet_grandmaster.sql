ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('CREATE','UPDATE','DELETE','ADVANCE_STEP','RESTORE') NOT NULL;--> statement-breakpoint
ALTER TABLE `attachments` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `comments` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `defects` ADD `supplierId` int;--> statement-breakpoint
ALTER TABLE `defects` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `deletedAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_attachments_defect_id` ON `attachments` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_defect_id` ON `audit_logs` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_timestamp` ON `audit_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_comments_defect_id` ON `comments` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_defects_supplier` ON `defects` (`supplier`);--> statement-breakpoint
CREATE INDEX `idx_defects_supplier_id` ON `defects` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_defects_status` ON `defects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_defects_step` ON `defects` (`step`);--> statement-breakpoint
CREATE INDEX `idx_defects_open_date` ON `defects` (`openDate`);--> statement-breakpoint
CREATE INDEX `idx_defects_year` ON `defects` (`year`);--> statement-breakpoint
CREATE INDEX `idx_defects_week_key` ON `defects` (`weekKey`);--> statement-breakpoint
CREATE INDEX `idx_defects_doc_number` ON `defects` (`docNumber`);--> statement-breakpoint
CREATE INDEX `idx_defects_deleted_at` ON `defects` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `idx_notifications_defect_id` ON `notifications` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_notifications_status` ON `notifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sla_configs_step` ON `sla_configs` (`step`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_access_code` ON `suppliers` (`accessCode`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_name` ON `suppliers` (`name`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_is_active` ON `suppliers` (`isActive`);