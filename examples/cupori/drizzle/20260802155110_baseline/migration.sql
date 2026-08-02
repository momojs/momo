CREATE TABLE `stamp_rally` (
	`id` text PRIMARY KEY NOT NULL,
	`photo` text NOT NULL,
	`cup_type` text NOT NULL,
	`size` text NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`sugar` real DEFAULT 0 NOT NULL,
	`caffeine` real DEFAULT 0 NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`brand` text,
	`note` text,
	`consumed_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stamp_rally_id_length_check" CHECK(length("id") > 0),
	CONSTRAINT "stamp_rally_photo_length_check" CHECK(length("photo") <= 255),
	CONSTRAINT "stamp_rally_cup_type_check" CHECK("cup_type" in ('espresso', 'latte', 'coffee_special', 'americano', 'cappuccino', 'mocha', 'caramel_macchiato', 'flat_white', 'fruit_tea', 'milk_tea', 'milk', 'pure_tea', 'fruit_juice', 'sparkling_water', 'lemon_tea', 'flower_tea', 'unknown')),
	CONSTRAINT "stamp_rally_size_check" CHECK("size" in ('short', 'tall', 'grande', 'venti')),
	CONSTRAINT "stamp_rally_price_check" CHECK("price" between 0 and 9999),
	CONSTRAINT "stamp_rally_calories_check" CHECK("calories" between 0 and 1000),
	CONSTRAINT "stamp_rally_sugar_check" CHECK("sugar" between 0 and 100),
	CONSTRAINT "stamp_rally_caffeine_check" CHECK("caffeine" between 0 and 500),
	CONSTRAINT "stamp_rally_rating_check" CHECK(typeof("rating") = 'integer' and "rating" between 0 and 5),
	CONSTRAINT "stamp_rally_brand_length_check" CHECK("brand" is null or length("brand") <= 40),
	CONSTRAINT "stamp_rally_note_length_check" CHECK("note" is null or length("note") <= 240),
	CONSTRAINT "stamp_rally_consumed_at_type_check" CHECK(typeof("consumed_at") = 'integer'),
	CONSTRAINT "stamp_rally_created_at_type_check" CHECK(typeof("created_at") = 'integer'),
	CONSTRAINT "stamp_rally_updated_at_type_check" CHECK(typeof("updated_at") = 'integer'),
	CONSTRAINT "stamp_rally_revision_check" CHECK(typeof("revision") = 'integer' and "revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `stamp_rally_consumed_at_idx` ON `stamp_rally` ("consumed_at" desc);--> statement-breakpoint
CREATE INDEX `stamp_rally_photo_idx` ON `stamp_rally` (`photo`);--> statement-breakpoint
CREATE INDEX `stamp_rally_cup_type_consumed_at_idx` ON `stamp_rally` (`cup_type`,"consumed_at" desc);