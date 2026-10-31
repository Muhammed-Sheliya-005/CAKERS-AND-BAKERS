CREATE TABLE IF NOT EXISTS `adminNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('order','enquiry','custom_enquiry') NOT NULL,
	`entityId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `adminNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessSettings` (
	`id` int NOT NULL DEFAULT 1,
	`businessName` varchar(120) NOT NULL DEFAULT 'Cakers & Cakers',
	`businessAddress` text NOT NULL,
	`contactPhone` varchar(32) NOT NULL DEFAULT '',
	`contactEmail` varchar(320) NOT NULL DEFAULT '',
	`openingHours` varchar(500) NOT NULL DEFAULT 'Tuesday–Sunday · 10:00 am–8:00 pm',
	`deliveryEnabled` boolean NOT NULL DEFAULT true,
	`pickupEnabled` boolean NOT NULL DEFAULT true,
	`deliveryFeePaise` int NOT NULL DEFAULT 4900,
	`freeDeliveryThresholdPaise` int NOT NULL DEFAULT 79900,
	`acceptingOrders` boolean NOT NULL DEFAULT true,
	`allowedPaymentMethods` varchar(80) NOT NULL DEFAULT 'cod,pay_at_store',
	`notifyNewOrders` boolean NOT NULL DEFAULT true,
	`notifyNewEnquiries` boolean NOT NULL DEFAULT true,
	`notifyLowStock` boolean NOT NULL DEFAULT true,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerEnquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(120) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`subject` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','in_progress','resolved') NOT NULL DEFAULT 'new',
	`internalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerEnquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`unit` varchar(24) NOT NULL,
	`quantityMilli` int NOT NULL DEFAULT 0,
	`minimumQuantityMilli` int NOT NULL DEFAULT 0,
	`supplier` varchar(200),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_name_unique` UNIQUE(`name`),
	CONSTRAINT `inventory_quantity_nonnegative` CHECK(`inventoryItems`.`quantityMilli` >= 0),
	CONSTRAINT `inventory_minimum_nonnegative` CHECK(`inventoryItems`.`minimumQuantityMilli` >= 0)
);
--> statement-breakpoint
CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`kind` enum('received','used','adjustment') NOT NULL,
	`quantityMilli` int NOT NULL,
	`deltaMilli` int NOT NULL,
	`note` varchar(500) NOT NULL,
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromStatus` enum('Order Placed','Confirmed','Preparing','Ready for Pickup / Out for Delivery','Delivered','Cancelled'),
	`toStatus` enum('Order Placed','Confirmed','Preparing','Ready for Pickup / Out for Delivery','Delivered','Cancelled') NOT NULL,
	`note` varchar(500),
	`changedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`kind` enum('received','refunded') NOT NULL,
	`method` enum('cash','upi','card','bank_transfer','cod','pay_at_store') NOT NULL,
	`amountPaise` int NOT NULL,
	`reference` varchar(120),
	`notes` varchar(500),
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_amount_positive` CHECK(`paymentRecords`.`amountPaise` > 0)
);
--> statement-breakpoint
CREATE TABLE `productVariants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`pricePaise` int NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productVariants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variant_name_unique` UNIQUE(`productId`,`name`),
	CONSTRAINT `product_variant_price_positive` CHECK(`productVariants`.`pricePaise` > 0),
	CONSTRAINT `product_variant_stock_nonnegative` CHECK(`productVariants`.`stock` >= 0)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','staff','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `categories` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `customCakeEnquiries` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `orderItems` ADD `variantId` int;--> statement-breakpoint
ALTER TABLE `orderItems` ADD `variantNameSnapshot` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillmentMethod` enum('delivery','pickup') DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentStatus` enum('unpaid','partially_paid','paid','refunded') DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `eggOption` enum('eggless','contains_egg','choice') DEFAULT 'choice' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `customizationOptions` text;--> statement-breakpoint
ALTER TABLE `products` ADD `preparationMinutes` int DEFAULT 240 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `advanceOrderHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_itemId_inventoryItems_id_fk` FOREIGN KEY (`itemId`) REFERENCES `inventoryItems`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD CONSTRAINT `inventoryMovements_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderStatusHistory` ADD CONSTRAINT `orderStatusHistory_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderStatusHistory` ADD CONSTRAINT `orderStatusHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentRecords` ADD CONSTRAINT `paymentRecords_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentRecords` ADD CONSTRAINT `paymentRecords_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productVariants` ADD CONSTRAINT `productVariants_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_notifications_read_created_idx` ON `adminNotifications` (`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_notifications_entity_idx` ON `adminNotifications` (`kind`,`entityId`);--> statement-breakpoint
CREATE INDEX `customer_enquiries_status_created_idx` ON `customerEnquiries` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_items_active_updated_idx` ON `inventoryItems` (`isActive`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `inventory_movement_item_created_idx` ON `inventoryMovements` (`itemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `order_history_order_created_idx` ON `orderStatusHistory` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_records_order_created_idx` ON `paymentRecords` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_records_kind_created_idx` ON `paymentRecords` (`kind`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `productVariants` (`productId`);--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_variantId_productVariants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `productVariants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_payment_status_idx` ON `orders` (`paymentStatus`,`createdAt`);
