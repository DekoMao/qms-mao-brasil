CREATE TABLE `ai_agent_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`defectId` int,
	`decisionType` varchar(100) NOT NULL,
	`input` json NOT NULL,
	`output` json NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`autonomyLevel` enum('auto','review','hitl','blocked') NOT NULL,
	`status` enum('PENDING','EXECUTED','APPROVED','REJECTED','OVERRIDDEN') DEFAULT 'PENDING',
	`executedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`humanOverride` json,
	`tenantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_agent_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_agent_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`jobType` varchar(100) NOT NULL,
	`priority` int DEFAULT 5,
	`payload` json NOT NULL,
	`status` enum('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED') DEFAULT 'QUEUED',
	`attempts` int DEFAULT 0,
	`maxAttempts` int DEFAULT 3,
	`result` json,
	`error` text,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`tenantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_agent_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_agent_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`totalDecisions` int DEFAULT 0,
	`autoExecuted` int DEFAULT 0,
	`humanApproved` int DEFAULT 0,
	`humanRejected` int DEFAULT 0,
	`humanOverridden` int DEFAULT 0,
	`avgConfidence` decimal(5,4),
	`accuracyRate` decimal(5,4),
	`avgResponseTimeMs` int,
	`tenantId` int,
	CONSTRAINT `ai_agent_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_autonomy_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`tenantId` int,
	`enabled` boolean DEFAULT true,
	`autoThreshold` decimal(5,4) DEFAULT '0.8500',
	`reviewThreshold` decimal(5,4) DEFAULT '0.6000',
	`maxAutoDecisionsPerHour` int DEFAULT 100,
	`criticalActions` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_autonomy_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_cron_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`cronExpression` varchar(50) NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`jobType` varchar(100) NOT NULL,
	`payload` json,
	`enabled` boolean DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastStatus` enum('SUCCESS','FAILED','SKIPPED'),
	`tenantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_cron_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`modelVersion` varchar(20) NOT NULL,
	`modelType` varchar(50) NOT NULL,
	`weights` json NOT NULL,
	`trainingDataCount` int,
	`accuracyScore` decimal(5,4),
	`isActive` boolean DEFAULT false,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('CREATE','UPDATE','DELETE','ADVANCE_STEP','RESTORE','RBAC_SEED','RBAC_SET_PERMISSIONS','RBAC_ASSIGN_ROLE','RBAC_REMOVE_ROLE','WORKFLOW_CREATE','WORKFLOW_NEW_VERSION','WORKFLOW_CREATE_INSTANCE','WORKFLOW_ADVANCE','TENANT_CREATE','TENANT_ADD_USER','TENANT_REMOVE_USER','WEBHOOK_CREATE','WEBHOOK_DELETE','WEBHOOK_TEST','DOCUMENT_CREATE','DOCUMENT_STATUS_CHANGE','DOCUMENT_ADD_VERSION','DOCUMENT_DELETE','TENANT_SWITCH','API_KEY_CREATE','API_KEY_REVOKE','AI_AUTO_CLASSIFY','AI_AUTO_SEVERITY','AI_AUTO_ASSIGN','AI_AUTO_ADVANCE','AI_AUTO_ESCALATE','AI_AUTO_CLOSE','AI_ANOMALY_DETECTED','AI_PREDICTION','AI_REPORT_GENERATED','AI_AGENT_RESTART','AI_AGENT_FALLBACK','AI_FEEDBACK_OVERRIDE','AI_CONFIG_CHANGE') NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_ai_decisions_agent` ON `ai_agent_decisions` (`agentName`);--> statement-breakpoint
CREATE INDEX `idx_ai_decisions_defect` ON `ai_agent_decisions` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_ai_decisions_status` ON `ai_agent_decisions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_decisions_tenant` ON `ai_agent_decisions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ai_decisions_created` ON `ai_agent_decisions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_agent` ON `ai_agent_jobs` (`agentName`);--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_status` ON `ai_agent_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_priority` ON `ai_agent_jobs` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_tenant` ON `ai_agent_jobs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ai_jobs_scheduled` ON `ai_agent_jobs` (`scheduledAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_metrics_agent_date` ON `ai_agent_metrics` (`agentName`,`metricDate`);--> statement-breakpoint
CREATE INDEX `idx_ai_metrics_tenant` ON `ai_agent_metrics` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ai_config_agent_tenant` ON `ai_autonomy_config` (`agentName`,`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ai_cron_name` ON `ai_cron_jobs` (`name`);--> statement-breakpoint
CREATE INDEX `idx_ai_cron_agent` ON `ai_cron_jobs` (`agentName`);--> statement-breakpoint
CREATE INDEX `idx_ai_cron_enabled` ON `ai_cron_jobs` (`enabled`);--> statement-breakpoint
CREATE INDEX `idx_ai_cron_next_run` ON `ai_cron_jobs` (`nextRunAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_models_agent_version` ON `ai_models` (`agentName`,`modelVersion`);--> statement-breakpoint
CREATE INDEX `idx_ai_models_active` ON `ai_models` (`isActive`);