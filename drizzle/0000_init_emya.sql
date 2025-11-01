CREATE TABLE `favorites` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`relation_type` varchar(255) NOT NULL,
	`relation_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_favorites` UNIQUE(`relation_type`,`relation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `library` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(255),
	`role` varchar(255),
	CONSTRAINT `library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `token` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`token` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`device_client` varchar(255),
	`device_name` varchar(255),
	`device_id` varchar(255),
	`device_version` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_used_at` timestamp,
	CONSTRAINT `token_id` PRIMARY KEY(`id`),
	CONSTRAINT `uni_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`username` varchar(255),
	`password` varchar(255),
	`folders` json,
	`is_can_down` boolean,
	`is_disable` boolean,
	`remark` varchar(255),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_user` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `user_video_record` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`video_list_id` bigint unsigned NOT NULL,
	`video_season_id` bigint unsigned,
	`video_episode_id` bigint unsigned,
	`play_seconds` bigint unsigned,
	`is_complete` boolean,
	`user_id` bigint unsigned NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_video_record_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_episode` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`video_list_id` bigint unsigned NOT NULL,
	`video_season_id` bigint unsigned NOT NULL,
	`episode_number` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`date_air` date,
	`runtime` smallint unsigned,
	CONSTRAINT `video_episode_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_episode` UNIQUE(`video_list_id`,`video_season_id`,`episode_number`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_genre` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`tmdb_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `video_genre_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_genre` UNIQUE(`tmdb_id`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_image` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`type` varchar(255) NOT NULL,
	`relation_type` varchar(255) NOT NULL,
	`relation_id` bigint unsigned NOT NULL,
	`path_type` varchar(255),
	`path_url` text,
	`user_id` bigint unsigned,
	CONSTRAINT `video_image_id` PRIMARY KEY(`id`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_list` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`video_library_id` bigint unsigned NOT NULL,
	`video_type` varchar(255) NOT NULL,
	`tmdb_id` varchar(255),
	`title` varchar(255) NOT NULL,
	`origin_title` varchar(255),
	`description` text,
	`tagline` text,
	`genres` json,
	`peoples` json,
	`upcoming` varchar(255),
	`date_air` date,
	`runtime` smallint unsigned,
	`remark` varchar(255),
	CONSTRAINT `video_list_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_list` UNIQUE(`video_type`,`tmdb_id`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`uuid` char(36),
	`video_list_id` bigint unsigned NOT NULL,
	`video_season_id` bigint unsigned,
	`video_episode_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`status` varchar(255) NOT NULL,
	`file_size` bigint unsigned,
	`file_second` bigint unsigned,
	`file_streams` json,
	`file_container` varchar(255),
	`file_chapters` json,
	`path_type` varchar(255),
	`path_url` text,
	`user_id` bigint unsigned,
	`number_view` bigint unsigned,
	CONSTRAINT `video_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `video_media_uuid_unique` UNIQUE(`uuid`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_people` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`tmdb_id` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`gender` tinyint unsigned NOT NULL,
	`description` text,
	`birthday` date,
	`deathday` date,
	CONSTRAINT `video_people_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_people` UNIQUE(`tmdb_id`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_season` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`video_list_id` bigint unsigned NOT NULL,
	`season_number` bigint unsigned NOT NULL,
	`season_number_custom` bigint unsigned,
	`title` varchar(255) NOT NULL,
	`description` text,
	`date_air` date,
	CONSTRAINT `video_season_id` PRIMARY KEY(`id`),
	CONSTRAINT `unx_season` UNIQUE(`video_list_id`,`season_number`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE TABLE `video_subtitle` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`video_media_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`codec` varchar(255) NOT NULL,
	`path_type` varchar(255),
	`path_url` text,
	`user_id` bigint unsigned,
	CONSTRAINT `video_subtitle_id` PRIMARY KEY(`id`)
) AUTO_INCREMENT = 1001;
--> statement-breakpoint
CREATE INDEX `idx_name` ON `library` (`name`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `token` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_video_record` ON `user_video_record` (`video_list_id`,`user_id`,`is_complete`);--> statement-breakpoint
CREATE INDEX `idx_image` ON `video_image` (`relation_type`,`relation_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `video_image` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_title` ON `video_list` (`title`);--> statement-breakpoint
CREATE INDEX `idx_origin_title` ON `video_list` (`origin_title`);--> statement-breakpoint
CREATE INDEX `idx_date_air` ON `video_list` (`date_air`);--> statement-breakpoint
CREATE INDEX `idx_media` ON `video_media` (`video_list_id`,`video_season_id`,`video_episode_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `video_media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_video_media_id` ON `video_subtitle` (`video_media_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `video_subtitle` (`user_id`);
