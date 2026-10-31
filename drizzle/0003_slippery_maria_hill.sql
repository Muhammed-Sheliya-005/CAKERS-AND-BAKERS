CREATE TABLE `productStockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`kind` enum('received','used','adjustment','order','initial','cancellation') NOT NULL,
	`quantity` int NOT NULL,
	`delta` int NOT NULL,
	`note` varchar(500) NOT NULL,
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productStockMovements_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_stock_movement_quantity_nonnegative` CHECK(`productStockMovements`.`quantity` >= 0)
);
--> statement-breakpoint
ALTER TABLE `productStockMovements` ADD CONSTRAINT `productStockMovements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productStockMovements` ADD CONSTRAINT `productStockMovements_variantId_productVariants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `productVariants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productStockMovements` ADD CONSTRAINT `productStockMovements_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_stock_movement_product_created_idx` ON `productStockMovements` (`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_stock_movement_variant_idx` ON `productStockMovements` (`variantId`);