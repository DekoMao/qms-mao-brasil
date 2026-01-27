CREATE TABLE `notification_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200),
	`notificationType` enum('SLA_WARNING','SLA_EXCEEDED','STEP_CHANGE','SUPPLIER_UPDATE','ALL') NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`type` enum('SLA_WARNING','SLA_EXCEEDED','STEP_CHANGE','SUPPLIER_UPDATE') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(200),
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`status` enum('PENDING','SENT','FAILED') DEFAULT 'PENDING',
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `root_cause_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`parentId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `root_cause_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `root_cause_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sla_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`step` enum('Aguardando Disposição','Aguardando Análise Técnica','Aguardando Causa Raiz','Aguardando Ação Corretiva','Aguardando Validação de Ação Corretiva') NOT NULL,
	`severityMg` enum('S','A','B','C'),
	`maxDays` int NOT NULL DEFAULT 7,
	`warningDays` int NOT NULL DEFAULT 5,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sla_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`code` varchar(50),
	`email` varchar(320),
	`contactName` varchar(200),
	`phone` varchar(50),
	`accessCode` varchar(100),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_name_unique` UNIQUE(`name`)
);
