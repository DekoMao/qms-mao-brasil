CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedBy` int,
	`uploadedByName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`userId` int,
	`userName` varchar(100),
	`action` enum('CREATE','UPDATE','DELETE','ADVANCE_STEP') NOT NULL,
	`fieldName` varchar(100),
	`oldValue` text,
	`newValue` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`metadata` json,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`userId` int,
	`userName` varchar(100),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `defects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`docNumber` varchar(20) NOT NULL,
	`openDate` date NOT NULL,
	`year` int,
	`weekKey` varchar(10),
	`monthName` varchar(20),
	`mg` enum('S','A','B','C'),
	`defectsSeverity` varchar(100),
	`category` varchar(100),
	`model` varchar(100),
	`customer` varchar(100),
	`pn` varchar(100),
	`material` varchar(200),
	`symptom` varchar(500),
	`detection` varchar(200),
	`rate` decimal(10,4),
	`qty` int,
	`description` text,
	`evidence` text,
	`cause` text,
	`correctiveActions` text,
	`trackingProgress` text,
	`supplier` varchar(200),
	`supplyFeedback` text,
	`statusSupplyFB` enum('On Time','Late Replay','DELAYED','ONGOING'),
	`owner` varchar(100),
	`targetDate` date,
	`checkSolution` boolean DEFAULT false,
	`qcrNumber` varchar(50),
	`occurrence` date,
	`dateDisposition` date,
	`dateTechAnalysis` date,
	`dateRootCause` date,
	`dateCorrectiveAction` date,
	`dateValidation` date,
	`step` enum('Aguardando Disposição','Aguardando Análise Técnica','Aguardando Causa Raiz','Aguardando Ação Corretiva','Aguardando Validação de Ação Corretiva','CLOSED') DEFAULT 'Aguardando Disposição',
	`status` enum('CLOSED','ONGOING','DELAYED','Waiting for CHK Solution') DEFAULT 'ONGOING',
	`closeWeekKey` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`updatedBy` int,
	CONSTRAINT `defects_id` PRIMARY KEY(`id`),
	CONSTRAINT `defects_docNumber_unique` UNIQUE(`docNumber`)
);
--> statement-breakpoint
CREATE TABLE `import_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalRows` int NOT NULL,
	`successRows` int NOT NULL,
	`errorRows` int NOT NULL,
	`errors` json,
	`importedBy` int,
	`importedByName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','sqa','supplier','viewer') NOT NULL DEFAULT 'user';