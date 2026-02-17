CREATE TABLE `ai_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`type` enum('ROOT_CAUSE','CORRECTIVE_ACTION','RECURRENCE_RISK') NOT NULL,
	`suggestion` text NOT NULL,
	`confidence` decimal(3,2),
	`suggestedCategory` varchar(200),
	`accepted` boolean,
	`acceptedBy` int,
	`acceptedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_defaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`costType` enum('SCRAP','REWORK','REINSPECTION','DOWNTIME','WARRANTY','RETURN','RECALL','COMPLAINT','INSPECTION','TESTING','AUDIT','TRAINING','PLANNING','QUALIFICATION','OTHER') NOT NULL,
	`costCategory` enum('INTERNAL_FAILURE','EXTERNAL_FAILURE','APPRAISAL','PREVENTION') NOT NULL,
	`defaultAmount` decimal(12,2),
	`unitType` enum('PER_UNIT','PER_HOUR','PER_INCIDENT','FIXED') DEFAULT 'PER_INCIDENT',
	`description` text,
	`isActive` boolean DEFAULT true,
	CONSTRAINT `cost_defaults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `defect_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`costType` enum('SCRAP','REWORK','REINSPECTION','DOWNTIME','WARRANTY','RETURN','RECALL','COMPLAINT','INSPECTION','TESTING','AUDIT','TRAINING','PLANNING','QUALIFICATION','OTHER') NOT NULL,
	`costCategory` enum('INTERNAL_FAILURE','EXTERNAL_FAILURE','APPRAISAL','PREVENTION') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'BRL',
	`description` text,
	`evidenceUrl` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `defect_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_score_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricKey` varchar(50) NOT NULL,
	`metricName` varchar(200) NOT NULL,
	`description` text,
	`weight` decimal(5,2) NOT NULL DEFAULT '1.00',
	`isActive` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_score_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_score_configs_metricKey_unique` UNIQUE(`metricKey`)
);
--> statement-breakpoint
CREATE TABLE `supplier_score_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`periodKey` varchar(7) NOT NULL,
	`overallScore` decimal(5,2) NOT NULL,
	`grade` enum('A','B','C','D') NOT NULL,
	`metrics` json NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_score_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_suggestions_defect` ON `ai_suggestions` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_ai_suggestions_type` ON `ai_suggestions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_defect_costs_defectId` ON `defect_costs` (`defectId`);--> statement-breakpoint
CREATE INDEX `idx_defect_costs_category` ON `defect_costs` (`costCategory`);--> statement-breakpoint
CREATE INDEX `idx_score_supplier` ON `supplier_score_history` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_score_period` ON `supplier_score_history` (`periodKey`);