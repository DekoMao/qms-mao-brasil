CREATE TABLE `bi_dashboards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`layout` json,
	`isDefault` boolean DEFAULT false,
	`isShared` boolean DEFAULT false,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bi_dashboards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bi_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dashboardId` int NOT NULL,
	`widgetType` enum('KPI_CARD','BAR_CHART','LINE_CHART','PIE_CHART','DONUT_CHART','RADAR_CHART','TABLE','HEATMAP','GAUGE','TREND_SPARKLINE') NOT NULL,
	`title` varchar(200) NOT NULL,
	`dataSource` enum('DEFECT_COUNT','DEFECT_BY_STATUS','DEFECT_BY_SEVERITY','DEFECT_BY_SUPPLIER','DEFECT_BY_PLANT','DEFECT_TREND','COPQ_TOTAL','COPQ_BY_CATEGORY','COPQ_TREND','SLA_COMPLIANCE','SLA_VIOLATIONS','SUPPLIER_SCORES','SUPPLIER_RANKING','RESOLUTION_TIME','RECURRENCE_RATE','OPEN_VS_CLOSED','TOP_ROOT_CAUSES','MONTHLY_COMPARISON') NOT NULL,
	`config` json,
	`position` json NOT NULL,
	`refreshInterval` int DEFAULT 300,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bi_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bi_dash_tenant` ON `bi_dashboards` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_bi_dash_user` ON `bi_dashboards` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_bi_widget_dash` ON `bi_widgets` (`dashboardId`);