CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`version` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`changeDescription` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`title` varchar(300) NOT NULL,
	`documentNumber` varchar(50) NOT NULL,
	`category` enum('PROCEDURE','WORK_INSTRUCTION','FORM','TEMPLATE','SPECIFICATION','REPORT','CERTIFICATE','OTHER') NOT NULL,
	`currentVersion` int DEFAULT 1,
	`status` enum('DRAFT','IN_REVIEW','APPROVED','OBSOLETE') DEFAULT 'DRAFT',
	`ownerId` int NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`expiresAt` timestamp,
	`tags` json,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource` varchar(100) NOT NULL,
	`action` varchar(50) NOT NULL,
	`description` text,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isSystem` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `tenant_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(100) DEFAULT 'user',
	`isActive` boolean DEFAULT true,
	CONSTRAINT `tenant_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`plan` enum('FREE','STARTER','PROFESSIONAL','ENTERPRISE') DEFAULT 'FREE',
	`maxUsers` int DEFAULT 10,
	`maxDefects` int DEFAULT 500,
	`isActive` boolean DEFAULT true,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`name` varchar(200) NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(200) NOT NULL,
	`events` json NOT NULL,
	`headers` json,
	`isActive` boolean DEFAULT true,
	`retryPolicy` json,
	`failCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`event` varchar(100) NOT NULL,
	`payload` json NOT NULL,
	`responseStatus` int,
	`responseBody` text,
	`attempts` int DEFAULT 0,
	`status` enum('PENDING','SUCCESS','FAILED','RETRYING') DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`version` int NOT NULL DEFAULT 1,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`steps` json NOT NULL,
	`transitions` json NOT NULL,
	`metadata` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`definitionId` int NOT NULL,
	`defectId` int NOT NULL,
	`currentStepId` varchar(50) NOT NULL,
	`stepHistory` json NOT NULL,
	`status` enum('ACTIVE','COMPLETED','CANCELLED','ON_HOLD') DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_dv_document` ON `document_versions` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_doc_tenant` ON `documents` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_doc_status` ON `documents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_doc_number` ON `documents` (`documentNumber`);--> statement-breakpoint
CREATE INDEX `idx_rp_role` ON `role_permissions` (`roleId`);--> statement-breakpoint
CREATE INDEX `idx_tu_tenant` ON `tenant_users` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_tu_user` ON `tenant_users` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_ur_user` ON `user_roles` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_whl_config` ON `webhook_logs` (`configId`);--> statement-breakpoint
CREATE INDEX `idx_whl_status` ON `webhook_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_wf_instance_defect` ON `workflow_instances` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_wf_instance_definition` ON `workflow_instances` (`definitionId`);