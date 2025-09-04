-- MySQL Database Schema for Nest Crontab GUI
-- This script creates the necessary tables for the application

-- Create tags table
CREATE TABLE IF NOT EXISTS `tags` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#808080',
  `usageCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tags_name` (`name`),
  KEY `IDX_tags_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cronjobs table
CREATE TABLE IF NOT EXISTS `cronjobs` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `method` enum('GET','POST') NOT NULL DEFAULT 'GET',
  `headers` text,
  `body` text,
  `schedule` varchar(255) NOT NULL,
  `scheduleType` enum('cron','repeat') NOT NULL DEFAULT 'cron',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `description` text,
  `lastExecutedAt` datetime DEFAULT NULL,
  `executionCount` int NOT NULL DEFAULT '0',
  `requestTimeout` int DEFAULT NULL,
  `executionMode` enum('sequential','parallel') NOT NULL DEFAULT 'sequential',
  `maxConcurrent` int NOT NULL DEFAULT '1',
  `currentRunning` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cronjobs_isActive` (`isActive`),
  KEY `IDX_cronjobs_scheduleType` (`scheduleType`),
  KEY `IDX_cronjobs_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create junction table for many-to-many relationship between cronjobs and tags
CREATE TABLE IF NOT EXISTS `cronjob_tags` (
  `cronjob_id` varchar(36) NOT NULL,
  `tag_id` varchar(36) NOT NULL,
  PRIMARY KEY (`cronjob_id`,`tag_id`),
  KEY `IDX_cronjob_tags_cronjob_id` (`cronjob_id`),
  KEY `IDX_cronjob_tags_tag_id` (`tag_id`),
  CONSTRAINT `FK_cronjob_tags_cronjob_id` FOREIGN KEY (`cronjob_id`) REFERENCES `cronjobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_cronjob_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create execution_logs table
CREATE TABLE IF NOT EXISTS `execution_logs` (
  `id` varchar(36) NOT NULL,
  `jobId` varchar(36) NOT NULL,
  `executedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('success','failed') NOT NULL,
  `responseCode` int DEFAULT NULL,
  `responseTime` int DEFAULT NULL,
  `executionTime` int DEFAULT NULL,
  `responseBody` text,
  `errorMessage` text,
  `triggeredManually` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_execution_logs_jobId` (`jobId`),
  KEY `IDX_execution_logs_executedAt` (`executedAt`),
  KEY `IDX_execution_logs_status` (`status`),
  CONSTRAINT `FK_execution_logs_jobId` FOREIGN KEY (`jobId`) REFERENCES `cronjobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;