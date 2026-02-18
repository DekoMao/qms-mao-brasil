CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`createdBy` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`keyPrefix` varchar(8) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`scopes` json NOT NULL,
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_apikey_tenant` ON `api_keys` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_apikey_prefix` ON `api_keys` (`keyPrefix`);--> statement-breakpoint
CREATE INDEX `idx_apikey_hash` ON `api_keys` (`keyHash`);