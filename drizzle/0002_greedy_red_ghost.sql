ALTER TABLE `defects` MODIFY COLUMN `openDate` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `targetDate` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `occurrence` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `dateDisposition` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `dateTechAnalysis` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `dateRootCause` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `dateCorrectiveAction` varchar(20);--> statement-breakpoint
ALTER TABLE `defects` MODIFY COLUMN `dateValidation` varchar(20);