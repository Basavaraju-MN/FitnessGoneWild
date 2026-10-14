-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 14, 2026 at 11:37 AM
-- Server version: 8.0.45
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fgonewild`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `action` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_type` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `detail` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_log_admin` (`admin_id`),
  KEY `idx_log_entity` (`entity_type`,`entity_id`),
  KEY `idx_log_date` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_log`
--

INSERT INTO `activity_log` (`id`, `admin_id`, `action`, `entity_type`, `entity_id`, `detail`, `created_at`) VALUES
(1, 1, 'trip.updated', 'trip', 1, 'Price changed from 2299 to 2499', '2026-08-10 10:30:13'),
(2, 1, 'review.published', 'review', 1, 'Published review by Rahul Menon', '2026-08-10 10:30:13'),
(3, 2, 'enquiry.updated', 'enquiry', 3, 'Status new to contacted', '2026-08-10 10:30:13'),
(4, 1, 'trip.featured', 'trip', 7, 'Added to featured trips', '2026-08-10 10:30:13'),
(19, 1, 'login', 'admin_user', 1, 'admin logged in', '2026-10-12 09:19:25'),
(30, 1, 'payment', 'booking', 12, '₹2100 via other · marked completed', '2026-10-12 10:03:07'),
(31, 1, 'create', 'admin_user', 11, 'Super Admin', '2026-10-12 10:05:05'),
(32, 11, 'login', 'admin_user', 11, 'Super Admin logged in', '2026-10-12 10:05:24'),
(33, 11, 'reset_password', 'admin_user', 2, 'meera', '2026-10-12 10:06:04'),
(34, 2, 'login', 'admin_user', 2, 'meera logged in', '2026-10-12 10:06:16'),
(35, 11, 'login', 'admin_user', 11, 'Super Admin logged in', '2026-10-12 10:06:43'),
(36, 11, 'update', 'admin_user', 2, 'full_name, email, role, is_active', '2026-10-12 10:15:20'),
(37, 2, 'login', 'admin_user', 2, 'meera logged in', '2026-10-12 10:15:32'),
(38, 11, 'login', 'admin_user', 11, 'Super Admin logged in', '2026-10-12 10:16:27'),
(39, 11, 'update', 'admin_user', 1, 'full_name, email, role, is_active', '2026-10-12 10:16:46'),
(40, 11, 'reset_password', 'admin_user', 1, 'admin', '2026-10-12 10:17:34'),
(41, 1, 'login', 'admin_user', 1, 'admin logged in', '2026-10-12 10:17:54'),
(42, 1, 'create', 'vehicles', 2, NULL, '2026-10-12 10:22:14'),
(43, 1, 'create', 'departure', 22, '2026-10-16 → 2026-10-19', '2026-10-12 10:23:33'),
(44, 1, 'create', 'booking', 14, 'Basavaraju M N · 1 people · ₹5555555', '2026-10-12 10:24:36'),
(45, 11, 'login', 'admin_user', 11, 'Super Admin logged in', '2026-10-12 10:26:25'),
(134, 11, 'create', 'trip', 28, 'Tadiandamol Trek – The Highest Peak of Coorg', '2026-10-12 16:40:00'),
(135, 11, 'upload_brochure', 'trip', 28, 'Tadiandamol Trek – The Highest Peak of Coorg-thefitnessgonewild.pdf', '2026-10-12 16:40:00'),
(149, 11, 'update', 'trip', 28, 'name, category_id, blurb, description, itinerary, duration_label, duration_days, difficulty, distance_label, price, without_transport_price, with_transport_price, price_note, badge_text, badge_style, is_featured, featured_label, featured_order, status, inclusions', '2026-10-12 16:56:16'),
(150, 11, 'update', 'trip', 28, 'name, category_id, blurb, description, itinerary, duration_label, duration_days, difficulty, distance_label, price, without_transport_price, with_transport_price, price_note, badge_text, badge_style, is_featured, featured_label, featured_order, status, inclusions', '2026-10-12 16:57:33'),
(151, 11, 'upload_photo', 'trip', 28, 'photo 1', '2026-10-12 16:57:33'),
(152, 11, 'duplicate', 'trip', 36, 'from #8 Dudhsagar Waterfalls Trek and Yellapura Sightseeing ', '2026-10-12 16:58:00'),
(154, 11, 'payment', 'booking', 14, '₹5525555 via upi · marked completed', '2026-10-12 17:06:13'),
(155, 11, 'update', 'enquiry', 12, 'status', '2026-10-12 18:40:54'),
(160, 11, 'update', 'enquiry', 12, 'status', '2026-10-12 18:41:10'),
(161, 11, 'update', 'enquiry', 12, 'status', '2026-10-12 18:41:32'),
(162, 11, 'update', 'enquiry', 12, 'status', '2026-10-12 18:41:35'),
(163, 11, 'login', 'admin_user', 11, 'Super Admin logged in', '2026-10-14 05:50:13'),
(164, 11, 'update', 'enquiry', 12, 'status', '2026-10-14 07:27:14'),
(168, 11, 'create', 'booking', 24, 'Girija · 1 people · ₹3675', '2026-10-14 10:10:22'),
(169, 11, 'create', 'booking', 25, 'samaratha · 2 people · ₹3500', '2026-10-14 10:15:37'),
(170, 11, 'update', 'booking', 25, 'status', '2026-10-14 10:18:37'),
(171, 11, 'refund', 'booking', 25, '₹1000 via upi (manual)', '2026-10-14 10:18:50'),
(175, 11, 'create', 'booking', 28, 'Basavaraju M N · 2 people · ₹12000', '2026-10-14 10:27:37'),
(179, 11, 'create', 'guides', 6, NULL, '2026-10-14 11:02:22'),
(180, 11, 'update', 'departure', 27, 'start_date, end_date, guide_id, trip_status, notes', '2026-10-14 11:02:35');

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','sales','operations','editor') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'sales',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `last_login_at`, `created_at`) VALUES
(1, 'admin', 'Admin', 'admin@fitnessgonewild.in', '$2b$10$tKPhWngo0nFe3KZMhTFWWuiPGz/Fleyl65aDV5RNH/V6FV3k.GBTe', 'operations', 1, '2026-10-12 10:17:54', '2026-08-10 10:30:13'),
(2, 'meera', 'Meera Raghavan', 'meera@fitnessgonewild.in', '$2b$10$BhLHeICME40gVvoTV6F4Muggxh3EvvNulJohvvAphsZgIb3JZ/9Vq', 'sales', 1, '2026-10-12 10:15:32', '2026-08-10 10:30:13'),
(11, 'Super Admin', 'Super Admin', 'superadmin@fitnessgonewild.in', '$2b$10$xiDW87mfEijXZ2XKODKCDuf6LrtkMVweGycIvJsqDf5m.ZP6T3Gay', 'admin', 1, '2026-10-14 05:50:13', '2026-10-12 10:05:05');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_ref` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `departure_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `trip_id` int DEFAULT NULL,
  `pickup_point_id` int DEFAULT NULL,
  `people` tinyint NOT NULL DEFAULT '1',
  `with_transport_people` tinyint NOT NULL DEFAULT '0',
  `without_transport_people` tinyint NOT NULL DEFAULT '0',
  `travel_mode` enum('with_transport','without_transport','mixed') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trek_start_date` date DEFAULT NULL,
  `trek_end_date` date DEFAULT NULL,
  `trip_days` tinyint DEFAULT NULL,
  `is_custom_trip` tinyint(1) NOT NULL DEFAULT '0',
  `amount` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `advance_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `refunded_at` datetime DEFAULT NULL,
  `payment_type` enum('full','advance') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'full',
  `status` enum('pending','confirmed','cancelled','completed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `payment_status` enum('unpaid','partial','paid','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'unpaid',
  `merchant_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_transaction_id` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phonepe_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_method` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `booked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_ref` (`booking_ref`),
  UNIQUE KEY `uq_bookings_merchant_order` (`merchant_order_id`),
  KEY `fk_bookings_customer` (`customer_id`),
  KEY `fk_bookings_pickup` (`pickup_point_id`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_departure` (`departure_id`),
  KEY `idx_bookings_trip` (`trip_id`),
  KEY `idx_bookings_trek_date` (`trek_start_date`)
) ENGINE=MyISAM AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `booking_ref`, `departure_id`, `customer_id`, `trip_id`, `pickup_point_id`, `people`, `with_transport_people`, `without_transport_people`, `travel_mode`, `trek_start_date`, `trek_end_date`, `trip_days`, `is_custom_trip`, `amount`, `amount_paid`, `advance_amount`, `balance_amount`, `refund_amount`, `refunded_at`, `payment_type`, `status`, `payment_status`, `merchant_order_id`, `payment_transaction_id`, `phonepe_order_id`, `payment_method`, `paid_at`, `notes`, `booked_at`, `updated_at`) VALUES
(21, 'TFGW-2026-0021', 28, 49, 2, 3, 1, 1, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 3675.00, 1575.00, 1575.00, 2100.00, 0.00, NULL, 'advance', 'confirmed', 'partial', 'FGW_1791969573585_72ea78c0bbad', NULL, 'OMO2610141449353455932896', NULL, '2026-10-14 14:49:47', NULL, '2026-10-14 09:19:47', '2026-10-14 09:19:47'),
(19, 'TFGW-2026-0019', 27, 44, 5, 13, 1, 1, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 3675.00, 3675.00, 0.00, 0.00, 0.00, NULL, 'full', 'confirmed', 'paid', 'FGW_1791829143202_1064d4d86382', NULL, 'OMO2610122349060324161546', NULL, '2026-10-12 23:49:18', NULL, '2026-10-12 18:19:18', '2026-10-12 18:19:18'),
(20, 'TFGW-2026-0020', 28, 48, 2, 15, 1, 1, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 3675.00, 3675.00, 0.00, 0.00, 0.00, NULL, 'full', 'confirmed', 'paid', 'FGW_1791968618457_0cb0657f0565', NULL, 'OMO2610141433401985932439', NULL, '2026-10-14 14:34:06', NULL, '2026-10-14 09:04:06', '2026-10-14 09:04:06'),
(24, 'TFGW-2026-0024', 28, 50, 2, 1, 1, 1, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 3675.00, 0.00, 1000.00, 2675.00, 0.00, NULL, 'full', 'confirmed', 'partial', NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-14 10:10:22', '2026-10-14 10:14:10'),
(25, 'TFGW-2026-0025', 27, 51, 5, 22, 2, 2, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 3500.00, 1000.00, 1000.00, 2500.00, 1000.00, '2026-10-14 15:48:50', 'advance', 'cancelled', 'refunded', NULL, NULL, NULL, NULL, '2026-10-14 15:45:38', NULL, '2026-10-14 10:15:37', '2026-10-14 10:18:50'),
(28, 'TFGW-2026-0028', 27, 50, 5, NULL, 2, 2, 0, 'with_transport', '2026-10-16', '2026-10-18', 3, 0, 12000.00, 5000.00, 5000.00, 7000.00, 0.00, NULL, 'advance', 'confirmed', 'partial', NULL, NULL, NULL, NULL, '2026-10-14 15:57:37', NULL, '2026-10-14 10:27:37', '2026-10-14 10:28:19');

-- --------------------------------------------------------

--
-- Table structure for table `booking_payments`
--

DROP TABLE IF EXISTS `booking_payments`;
CREATE TABLE IF NOT EXISTS `booking_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('cash','upi','bank_transfer','card','phonepe','other') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'upi',
  `reference` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_payments_booking` (`booking_id`),
  KEY `idx_booking_payments_date` (`paid_at`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_payments`
--

INSERT INTO `booking_payments` (`id`, `booking_id`, `amount`, `method`, `reference`, `note`, `received_by`, `paid_at`, `created_at`) VALUES
(21, 25, 1000.00, 'upi', NULL, 'Paid at booking', 11, '2026-10-14 15:45:37', '2026-10-14 10:15:37'),
(24, 28, 5000.00, 'upi', NULL, 'Paid at booking', 11, '2026-10-14 15:57:37', '2026-10-14 10:27:37');

-- --------------------------------------------------------

--
-- Table structure for table `booking_refunds`
--

DROP TABLE IF EXISTS `booking_refunds`;
CREATE TABLE IF NOT EXISTS `booking_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `mode` enum('phonepe','manual') COLLATE utf8mb4_general_ci NOT NULL,
  `method` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `merchant_refund_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phonepe_refund_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` enum('pending','completed','failed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `reference` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `error_message` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `initiated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_merchant_refund_id` (`merchant_refund_id`),
  KEY `idx_refunds_booking` (`booking_id`),
  KEY `idx_refunds_state` (`state`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_refunds`
--

INSERT INTO `booking_refunds` (`id`, `booking_id`, `amount`, `mode`, `method`, `merchant_refund_id`, `phonepe_refund_id`, `state`, `reference`, `reason`, `error_message`, `initiated_by`, `created_at`, `completed_at`) VALUES
(3, 25, 1000.00, 'manual', 'upi', NULL, NULL, 'completed', NULL, NULL, NULL, 11, '2026-10-14 10:18:50', '2026-10-14 15:48:50');

-- --------------------------------------------------------

--
-- Table structure for table `brochures`
--

DROP TABLE IF EXISTS `brochures`;
CREATE TABLE IF NOT EXISTS `brochures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int NOT NULL,
  `file_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `file_data` longblob NOT NULL,
  `file_size` int UNSIGNED NOT NULL,
  `mime_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'application/pdf',
  `download_count` int UNSIGNED NOT NULL DEFAULT '0',
  `uploaded_by` int DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brochure_trip` (`trip_id`),
  KEY `fk_brochures_admin` (`uploaded_by`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `brochures`
--

INSERT INTO `brochures` (`id`, `trip_id`, `file_name`, `file_data`, `file_size`, `mime_type`, `download_count`, `uploaded_by`, `uploaded_at`) VALUES
(11, 1, 'Netravati Peak Trek.pdf', '', 0, 'application/pdf', 2, NULL, '2026-10-12 18:33:18'),
(13, 5, 'Bandaje Arbi trek, Balarayanadurga fort and Rani Jhari.pdf', '', 0, 'application/pdf', 1, NULL, '2026-10-14 10:34:10');

-- --------------------------------------------------------

--
-- Table structure for table `brochure_downloads`
--

DROP TABLE IF EXISTS `brochure_downloads`;
CREATE TABLE IF NOT EXISTS `brochure_downloads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `trip_id` int DEFAULT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `follow_up_status` enum('not_contacted','contacted','interested','converted','not_interested') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'not_contacted',
  `notes` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `downloaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_brochure_downloads_trip` (`trip_id`),
  KEY `idx_brochure_downloads_status` (`follow_up_status`,`downloaded_at`),
  KEY `idx_brochure_downloads_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `brochure_downloads`
--

INSERT INTO `brochure_downloads` (`id`, `customer_id`, `trip_id`, `name`, `phone`, `email`, `follow_up_status`, `notes`, `assigned_to`, `downloaded_at`, `updated_at`) VALUES
(6, 45, 1, 'Basavaraju M N', '8765677777', NULL, 'not_contacted', NULL, NULL, '2026-10-12 18:33:18', '2026-10-12 18:33:18');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `slug`, `name`, `label`, `sort_order`, `is_active`) VALUES
(1, 'weekend', 'Weekend treks', 'Weekend trek', 1, 1),
(2, 'oneday', 'One day treks', 'One day trek', 2, 1),
(3, 'backpacking', 'Backpacking', 'Backpacking', 3, 1),
(4, 'bike', 'Bike rides', 'Bike ride', 4, 0);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
CREATE TABLE IF NOT EXISTS `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trip_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_email` (`email`),
  KEY `idx_customer_trip` (`trip_id`),
  KEY `idx_customer_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `city`, `trip_id`, `created_at`) VALUES
(44, 'Basavaraju M N', '8687353767', 'basavaraju.m.n22@gmail.com', NULL, 5, '2026-10-12 18:19:18'),
(45, 'Basavaraju M N', '8765677777', NULL, NULL, 1, '2026-10-12 18:33:18'),
(46, 'Basavaraju M N44', '8765677779', NULL, NULL, 1, '2026-10-12 18:39:52'),
(48, 'Basavaraju M N', '8765432345', 'basavaraju.m.n22@gmail.com', NULL, 2, '2026-10-14 09:04:06'),
(49, 'Basavaraju M N8', '9760765345', 'basavaraju.m.n22@gmail.com', NULL, 2, '2026-10-14 09:19:47'),
(50, 'Girija', '7675675843', 'basavar2aju.m.n22@gmail.com', NULL, 2, '2026-10-14 10:10:22'),
(51, 'samaratha', '8672828292', 'basavar322aju.m.n22@gmail.com', NULL, 5, '2026-10-14 10:15:37');

-- --------------------------------------------------------

--
-- Table structure for table `departures`
--

DROP TABLE IF EXISTS `departures`;
CREATE TABLE IF NOT EXISTS `departures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `departure_type` enum('scheduled','custom') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'scheduled',
  `seats_total` smallint NOT NULL DEFAULT '25',
  `seats_booked` smallint NOT NULL DEFAULT '0',
  `price_override` decimal(10,2) DEFAULT NULL,
  `status` enum('open','full','cancelled','completed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'open',
  `guide_id` int DEFAULT NULL,
  `trip_status` enum('upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'upcoming',
  `notes` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departure` (`trip_id`,`start_date`,`end_date`,`departure_type`),
  KEY `idx_departures_date` (`start_date`,`status`),
  KEY `idx_departures_trip` (`trip_id`)
) ENGINE=MyISAM AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departures`
--

INSERT INTO `departures` (`id`, `trip_id`, `start_date`, `end_date`, `departure_type`, `seats_total`, `seats_booked`, `price_override`, `status`, `guide_id`, `trip_status`, `notes`) VALUES
(27, 5, '2026-10-16', '2026-10-18', 'scheduled', 25, 1, NULL, 'open', 6, 'upcoming', NULL),
(28, 2, '2026-10-16', '2026-10-18', 'scheduled', 25, 3, NULL, 'open', NULL, 'upcoming', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `enquiries`
--

DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trip_id` int DEFAULT NULL,
  `people` tinyint NOT NULL DEFAULT '1',
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'new',
  `source` enum('website','brochure','whatsapp','phone','instagram','walkin') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'website',
  `assigned_to` int DEFAULT NULL,
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_enquiries_customer` (`customer_id`),
  KEY `fk_enquiries_trip` (`trip_id`),
  KEY `idx_enquiries_status` (`status`,`received_at`),
  KEY `fk_enquiries_admin` (`assigned_to`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `enquiries`
--

INSERT INTO `enquiries` (`id`, `customer_id`, `name`, `phone`, `email`, `trip_id`, `people`, `note`, `status`, `source`, `assigned_to`, `received_at`, `updated_at`) VALUES
(11, 45, 'Basavaraju M N', '8765677777', NULL, 1, 1, NULL, 'new', 'brochure', NULL, '2026-10-12 18:33:18', '2026-10-14 10:47:00'),
(12, 46, 'Basavaraju M N44', '8765677779', NULL, 1, 1, NULL, 'new', 'brochure', NULL, '2026-10-12 18:39:52', '2026-10-14 10:37:33'),
(16, NULL, 'Basavaraju M N', '7654314564', NULL, 5, 1, NULL, 'new', 'brochure', NULL, '2026-10-14 10:34:10', '2026-10-14 10:37:33');

-- --------------------------------------------------------

--
-- Table structure for table `faq`
--

DROP TABLE IF EXISTS `faq`;
CREATE TABLE IF NOT EXISTS `faq` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `answer` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `faq`
--

INSERT INTO `faq` (`id`, `question`, `answer`, `created_at`, `updated_at`) VALUES
(1, 'Do I need any trekking experience brfore?', 'Not for anything marked Easy. If you can walk 5 km without stopping, you can do Tadiandamol or Savandurga. Moderate treks assume you have done one trek before.', '2026-09-01 18:07:16', '2026-09-01 18:09:22'),
(2, 'What\'s included in the price?', 'Return transport from Bangalore, stay, the meals listed on the trip page, forest permits and your trek leader. Personal expenses aren\'t included.', '2026-09-01 18:07:16', '2026-09-01 18:07:16'),
(3, 'Where do you pick up from?', 'Majestic, Marathahalli, Silk Board, Yeshwanthpur and Banashankari. You pick one when you book, and we send the exact spot with a map link the day before.', '2026-09-01 18:07:16', '2026-09-01 18:07:16'),
(4, 'What if I need to cancel?', 'Full refund up to 7 days before departure, 50% up to 3 days before. After that we can move you to another date instead.', '2026-09-01 18:07:16', '2026-09-01 18:07:16'),
(5, 'What should I pack?', 'Shoes with grip, two litres of water, a rain jacket in monsoon, and a change of clothes. We email a full checklist once your booking is confirmed.', '2026-09-01 18:07:16', '2026-09-01 18:07:16'),
(6, 'Is it safe for solo travellers?', 'About 40% of our travellers come alone. Stays are separated by gender unless you\'re booking as a group, and there\'s a leader reachable through the night.', '2026-09-01 18:07:16', '2026-09-01 18:07:16');

-- --------------------------------------------------------

--
-- Table structure for table `google_business`
--

DROP TABLE IF EXISTS `google_business`;
CREATE TABLE IF NOT EXISTS `google_business` (
  `id` tinyint NOT NULL DEFAULT '1',
  `refresh_token` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `connected_email` varchar(190) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_name` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `location_name` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `location_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `average_rating` decimal(2,1) DEFAULT NULL,
  `total_reviews` int DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `last_error` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `connected_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guides`
--

DROP TABLE IF EXISTS `guides`;
CREATE TABLE IF NOT EXISTS `guides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `guides`
--

INSERT INTO `guides` (`id`, `name`, `phone`, `email`, `notes`, `is_active`, `created_at`) VALUES
(6, 'Basavaraju M N', '7259475693', 'basavaraju.m.n22@gmail.com', NULL, 1, '2026-10-14 11:02:22');

-- --------------------------------------------------------

--
-- Table structure for table `inclusion_exclusion`
--

DROP TABLE IF EXISTS `inclusion_exclusion`;
CREATE TABLE IF NOT EXISTS `inclusion_exclusion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int NOT NULL,
  `inclusion` text COLLATE utf8mb4_general_ci,
  `exclusion` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_inclusions_trip` (`trip_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inclusion_exclusion`
--

INSERT INTO `inclusion_exclusion` (`id`, `trip_id`, `inclusion`, `exclusion`) VALUES
(1, 1, 'Comfortable shared accommodation at a cozy local homestay with an authentic countryside experience\nClean and well-maintained shared washroom facilities\nRound-trip transportation from Bangalore to Bangalore in a Non-AC Semi Sleeper bus\nDelicious and nutritious meals included:\n- 2 Breakfasts\n- 1 Packed Lunch\n- 1 Dinner\nScenic visit to the beautiful Samse Tea Estate\nExciting jeep ride to the trek base through scenic forest routes\nForest entry and permit charges included in the package\nGuided trek experience with experienced trek leaders from The Fitness Gone Wild\nSafe, well-coordinated, and memorable adventure experience throughout the trip', 'Personal expenses such as snacks, beverages, shopping, and souvenirs are not included in the package\nPrivate or couple-only accommodation requests cannot be accommodated; stay will be on a shared homestay basis. Tent can be provided for couples but please confirm while booking.\nWashroom facilities during the trek are limited due to the remote forest location\nAny meals apart from those mentioned in the inclusions are self-sponsored\nAny activity, service, or expense not specifically mentioned under inclusions will be considered excluded from the package'),
(2, 2, 'Comfortable shared accommodation at a cozy local homestay with an authentic countryside experience\nClean and well-maintained shared washroom facilities\nRound-trip transportation from Bangalore to Bangalore in a Non-AC Semi Sleeper bus\nDelicious and nutritious meals included:\n- 2 Breakfasts\n- 1 Packed Lunch\n- 1 Dinner\nScenic visit to the beautiful Samse Tea Estate\nExciting jeep ride to the trek base through scenic forest routes\nForest entry and permit charges included in the package\nGuided trek experience with experienced trek leaders from The Fitness Gone Wild\nSafe, well-coordinated, and memorable adventure experience throughout the trip', 'Personal expenses such as snacks, beverages, shopping, and souvenirs are not included in the package\r\nPrivate or couple-only accommodation requests cannot be accommodated; stay will be on a shared homestay basis. Tent can be provided for couples but please confirm while booking.\r\nWashroom facilities during the trek are limited due to the remote forest location\r\nAny meals apart from those mentioned in the inclusions are self-sponsored\r\nAny activity, service, or expense not specifically mentioned under inclusions will be considered excluded from the package'),
(37, 28, 'Bangalore to Bangalore travel in AC Tempo Traveler or Mini Bus\n2 Breakfasts, 1 Packed Lunch, 1 Dinner, Snacks\nTent accommodation on sharing basis\nForest permits and trek permission\nTrek leads and local guide\nFirst aid assistance', 'Personal expenses and meals not mentioned\nEntry to Dubare Elephant Camp\nTravel and medical insurance\nAdditional sightseeing or services not mentioned\nAny cost arising due to emergencies or natural events\nJeep Ride Charges (Without Transportation Package): This applies only to participants who choose the Without Transportation package. Jeep ride charges required to reach the trek starting point are not included in the package price and must be paid separately by the participants on-site.');

-- --------------------------------------------------------

--
-- Table structure for table `lead_statuses`
--

DROP TABLE IF EXISTS `lead_statuses`;
CREATE TABLE IF NOT EXISTS `lead_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `stage` enum('open','won','lost') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'open',
  `tone` enum('blue','amber','green','red','grey') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'blue',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lead_status_key` (`status_key`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lead_statuses`
--

INSERT INTO `lead_statuses` (`id`, `status_key`, `label`, `stage`, `tone`, `sort_order`, `is_active`, `is_system`, `created_at`) VALUES
(1, 'new', 'New Enquiry', 'open', 'blue', 1, 1, 1, '2026-10-14 10:46:00'),
(2, 'call_not_picked', 'Call Not Picked', 'open', 'amber', 2, 1, 0, '2026-10-14 10:46:00'),
(3, 'call_not_picked_2', 'Call not picked 2', 'open', 'amber', 3, 1, 0, '2026-10-14 10:46:00'),
(4, 'call_not_picked_3', 'Call not picked 3', 'open', 'red', 4, 1, 0, '2026-10-14 10:46:00'),
(5, 'follow_up', 'Follow up', 'open', 'amber', 5, 1, 0, '2026-10-14 10:46:00'),
(6, 'plan_quote_sent', 'Plan & Quote Sent', 'open', 'blue', 6, 1, 0, '2026-10-14 10:46:00'),
(7, 'awaiting_payment', 'Awaiting Payment', 'open', 'amber', 7, 1, 0, '2026-10-14 10:46:00'),
(8, 'booked', 'Booked', 'won', 'green', 8, 1, 1, '2026-10-14 10:46:00'),
(9, 'lost_closed', 'Lost & Closed', 'lost', 'grey', 9, 1, 1, '2026-10-14 10:46:00'),
(10, 'future_prospect', 'Future Prospect', 'open', 'blue', 10, 1, 0, '2026-10-14 10:46:00'),
(11, 'duplicate', 'Duplicate', 'lost', 'grey', 11, 1, 0, '2026-10-14 10:46:00');

-- --------------------------------------------------------

--
-- Table structure for table `phonepe_transactions`
--

DROP TABLE IF EXISTS `phonepe_transactions`;
CREATE TABLE IF NOT EXISTS `phonepe_transactions` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `merchant_order_id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `merchant_transaction_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phonepe_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `booking_details` json NOT NULL,
  `amount` bigint NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_general_ci DEFAULT 'INR',
  `status` enum('PROCESSING','SUCCESS','FAILED','CANCELLED','PENDING') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PROCESSING',
  `phonepe_state` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `response_code` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `response_message` text COLLATE utf8mb4_general_ci,
  `payment_method` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transaction_id` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `provider_reference_id` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_timestamp` bigint DEFAULT NULL,
  `redirect_url` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant_order_id` (`merchant_order_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_transaction_id` (`transaction_id`)
) ENGINE=MyISAM AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `phonepe_transactions`
--

INSERT INTO `phonepe_transactions` (`id`, `merchant_order_id`, `merchant_transaction_id`, `phonepe_order_id`, `user_id`, `booking_details`, `amount`, `currency`, `status`, `phonepe_state`, `response_code`, `response_message`, `payment_method`, `transaction_id`, `provider_reference_id`, `payment_timestamp`, `redirect_url`, `created_at`, `updated_at`) VALUES
(31, 'FGW_1791969573585_72ea78c0bbad', NULL, 'OMO2610141449353455932896', NULL, '{\"gst\": 175, \"trekId\": 2, \"user_id\": null, \"subtotal\": 3500, \"trekDate\": \"Fri, 16 Oct - 18 Oct\", \"trekName\": \"Kudremukh Peak Trek\", \"tripDays\": 3, \"tripTotal\": 3675, \"balanceDue\": 2100, \"paymentType\": \"advance\", \"totalAmount\": 1575, \"tripEndDate\": \"2026-10-18\", \"customerName\": \"Basavaraju M N8\", \"isCustomTrip\": false, \"customerEmail\": \"basavaraju.m.n22@gmail.com\", \"customerPhone\": \"9760765345\", \"tripStartDate\": \"2026-10-16\", \"pickupLocation\": \"Silk Board\", \"transportation\": \"With Transportation\", \"withTransportPrice\": 3500, \"withTransportAmount\": 3500, \"transportationAmount\": 3500, \"withTransportTickets\": 1, \"withoutTransportPrice\": 1999, \"withoutTransportAmount\": 0, \"withoutTransportTickets\": 0, \"preferred_payment_method\": \"upi\"}', 157500, 'INR', 'SUCCESS', 'COMPLETED', NULL, NULL, NULL, NULL, NULL, NULL, 'http://localhost:5173/payment-result?merchantOrderId=FGW_1791969573585_72ea78c0bbad', '2026-10-14 14:49:33', '2026-10-14 14:49:47'),
(30, 'FGW_1791968618457_0cb0657f0565', NULL, 'OMO2610141433401985932439', NULL, '{\"gst\": 175, \"trekId\": 2, \"user_id\": null, \"subtotal\": 3500, \"trekDate\": \"Fri, 16 Oct - 18 Oct\", \"trekName\": \"Kudremukh Peak Trek\", \"tripDays\": 3, \"tripTotal\": 3675, \"balanceDue\": 0, \"paymentType\": \"full\", \"totalAmount\": 3675, \"tripEndDate\": \"2026-10-18\", \"customerName\": \"Basavaraju M N\", \"isCustomTrip\": false, \"customerEmail\": \"basavaraju.m.n22@gmail.com\", \"customerPhone\": \"8765432345\", \"tripStartDate\": \"2026-10-16\", \"pickupLocation\": \"Indiranagar\", \"transportation\": \"With Transportation\", \"withTransportPrice\": 3500, \"withTransportAmount\": 3500, \"transportationAmount\": 3500, \"withTransportTickets\": 1, \"withoutTransportPrice\": 1999, \"withoutTransportAmount\": 0, \"withoutTransportTickets\": 0, \"preferred_payment_method\": \"upi\"}', 367500, 'INR', 'SUCCESS', 'COMPLETED', NULL, NULL, NULL, NULL, NULL, NULL, 'http://localhost:5173/payment-result?merchantOrderId=FGW_1791968618457_0cb0657f0565', '2026-10-14 14:33:38', '2026-10-14 14:34:06'),
(29, 'FGW_1791829143202_1064d4d86382', NULL, 'OMO2610122349060324161546', NULL, '{\"gst\": 175, \"trekId\": 5, \"user_id\": null, \"subtotal\": 3500, \"trekDate\": \"Fri, 16 Oct - 18 Oct\", \"trekName\": \"Bandaje Arbi trek, Balarayanadurga fort and Rani Jhari\", \"tripDays\": 3, \"tripTotal\": 3675, \"balanceDue\": 0, \"paymentType\": \"full\", \"totalAmount\": 3675, \"tripEndDate\": \"2026-10-18\", \"customerName\": \"Basavaraju M N\", \"isCustomTrip\": false, \"customerEmail\": \"basavaraju.m.n22@gmail.com\", \"customerPhone\": \"8687353767\", \"tripStartDate\": \"2026-10-16\", \"pickupLocation\": \"Indiranagar\", \"transportation\": \"With Transportation\", \"withTransportPrice\": 3500, \"withTransportAmount\": 3500, \"transportationAmount\": 3500, \"withTransportTickets\": 1, \"withoutTransportPrice\": 1999, \"withoutTransportAmount\": 0, \"withoutTransportTickets\": 0, \"preferred_payment_method\": \"upi\"}', 367500, 'INR', 'SUCCESS', 'COMPLETED', NULL, NULL, NULL, NULL, NULL, NULL, 'http://localhost:5173/payment-result?merchantOrderId=FGW_1791829143202_1064d4d86382', '2026-10-12 23:49:03', '2026-10-12 23:49:18');

-- --------------------------------------------------------

--
-- Table structure for table `pickup_points`
--

DROP TABLE IF EXISTS `pickup_points`;
CREATE TABLE IF NOT EXISTS `pickup_points` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int DEFAULT NULL,
  `name` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `map_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pickup_trip_name` (`trip_id`,`name`),
  KEY `idx_pickup_trip` (`trip_id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pickup_points`
--

INSERT INTO `pickup_points` (`id`, `trip_id`, `name`, `address`, `map_url`, `is_active`, `sort_order`) VALUES
(1, 2, 'Majestic', 'Kempegowda Bus Station, Gate 3', NULL, 1, 1),
(2, NULL, 'Marathahalli', 'Marathahalli Bridge, near Innovative', NULL, 1, 2),
(3, 2, 'Silk Board', 'Silk Board Junction, HSR side', NULL, 1, 3),
(4, NULL, 'Yeshwanthpur', 'Yeshwanthpur Railway Station, Gate 1', NULL, 1, 4),
(5, NULL, 'Banashankari', 'BDA Complex, Banashankari 2nd Stage', NULL, 0, 5),
(6, 4, 'Indiranagar', 'Indiranagar Metro Station', NULL, 1, 1),
(7, 6, 'Majestic', 'Kempegowda Bus Station, Gate 3', NULL, 1, 1),
(8, 10, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(9, 9, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(10, 8, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(11, 7, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(12, 6, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(13, 5, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(14, 3, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(15, 2, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(16, 1, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(17, 10, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(18, 9, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(19, 8, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(20, 7, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(21, 6, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(22, 5, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(23, 4, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(24, 3, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(25, 2, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(26, 1, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(27, 10, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(28, 9, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(29, 8, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(30, 7, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(31, 6, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(32, 5, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(33, 4, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(34, 3, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(35, 2, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(36, 1, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(37, 10, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(38, 9, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(39, 8, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(40, 7, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(41, 6, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(42, 5, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(43, 4, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(44, 3, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(45, 2, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(46, 1, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4),
(79, 28, 'Indiranagar', 'Karachi Bekery', NULL, 1, 1),
(80, 28, 'Silk board', 'Madiwala police station', NULL, 1, 2),
(81, 36, 'Indiranagar', 'Karachi Bakery, Indiranagar', NULL, 1, 1),
(82, 36, 'Domlur', 'Domlur Sky Walk', NULL, 1, 2),
(83, 36, 'Yeshwanthpur', 'Yeshwanthpur (Tumkur Road side)', NULL, 1, 3),
(84, 36, 'Goraguntepalya', 'People Tree Hospital, Goraguntepalya', NULL, 1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source` enum('website','google') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'website',
  `google_review_id` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trip_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `author_name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `author_photo_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rating` tinyint NOT NULL,
  `body` varchar(4100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `owner_reply` varchar(4100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trip_month` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `avatar_colour` char(7) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '#14524A',
  `status` enum('pending','published','hidden') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `moderated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_google` (`google_review_id`),
  KEY `fk_reviews_customer` (`customer_id`),
  KEY `fk_reviews_booking` (`booking_id`),
  KEY `idx_reviews_status` (`status`),
  KEY `idx_reviews_trip` (`trip_id`,`status`),
  KEY `fk_reviews_admin` (`moderated_by`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `setting_value` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`setting_key`, `setting_value`, `label`, `updated_at`) VALUES
('advance_per_ticket', '1500', 'Advance per ticket (₹)', '2026-10-12 09:10:04'),
('booking_prefix', 'TFGW', 'Booking reference prefix', '2026-08-10 10:30:13'),
('business_address', 'Rajajinagar, Bengaluru', 'Business address', '2026-10-12 09:10:04'),
('business_name', 'The Fitness Gone Wild', 'Business name', '2026-10-12 09:10:04'),
('contact_email', 'hello@fitnessgonewild.in', 'Email', '2026-08-10 10:30:13'),
('contact_phone', '+91 98765 43210', 'Phone', '2026-08-10 10:30:13'),
('group_cap', '25', 'Maximum group size', '2026-08-10 10:30:13'),
('gst_percent', '5', 'GST (%)', '2026-10-12 09:10:04'),
('office_address', 'Indiranagar, Bengaluru', 'Office address', '2026-08-10 10:30:13'),
('pickup_points', 'Majestic, Marathahalli, Silk Board, Yeshwanthpur, Banashankari', 'Pickup points', '2026-08-10 10:30:13'),
('whatsapp_number', '+91 98765 43210', 'WhatsApp number', '2026-08-10 10:30:13');

-- --------------------------------------------------------

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
CREATE TABLE IF NOT EXISTS `trips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `category_id` int NOT NULL,
  `blurb` varchar(300) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `itinerary` longtext COLLATE utf8mb4_general_ci,
  `duration_label` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `duration_days` tinyint NOT NULL DEFAULT '1',
  `difficulty` enum('Easy','Moderate','Hard') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Easy',
  `distance_label` varchar(40) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `without_transport_price` decimal(10,2) DEFAULT '0.00',
  `with_transport_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_note` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `badge_text` varchar(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `badge_style` enum('plain','amber') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'plain',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `featured_label` varchar(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `featured_order` tinyint DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'published',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_trips_category` (`category_id`),
  KEY `idx_trips_featured` (`is_featured`,`featured_order`),
  KEY `idx_trips_status` (`status`)
) ENGINE=MyISAM AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trips`
--

INSERT INTO `trips` (`id`, `slug`, `name`, `category_id`, `blurb`, `description`, `itinerary`, `duration_label`, `duration_days`, `difficulty`, `distance_label`, `price`, `without_transport_price`, `with_transport_price`, `price_note`, `image_path`, `badge_text`, `badge_style`, `is_featured`, `featured_label`, `featured_order`, `status`, `created_at`, `updated_at`) VALUES
(1, 'netravati', 'Netravati Peak Trek', 1, 'Jeep Trail, Waterfall stop, River crossing, rolling grasslands', 'Nethravathi Peak, is a hidden gem for trekking enthusiasts. Known for its captivating natural beauty, this trek offers a perfect blend of adventure and serenity. The trek to Nethravathi Peak is moderately challenging, making it suitable for both beginners and experienced trekkers. Covering approximately 16-18 kilometers, the trail is filled with varied landscapes that include misty valleys, lush green meadows, and occasional wildlife sightings. As you ascend, you’ll be rewarded with panoramic views of the surrounding hills and valleys, and on clear days, you can witness breathtaking views of the Western Ghats stretching as far as the eye can see. The Nethravathi Peak trek takes you through dense forests, rolling grasslands, and scenic river streams, providing an exhilarating experience for nature lovers and adventure seekers alike.Starting from the base near the Kudremukh National Park, the trail takes you deep into the biodiversity-rich region, offering a glimpse of the region’s flora and fauna. The Nethravathi River, which originates from this peak, adds to the scenic beauty as it winds through the terrain. The peak itself stands as a rewarding vantage point, offering an unmatched view of the surrounding landscapes.We maintain a strict eco-friendly policy, ensuring that the Nethravathi trek remains free from litter and plastic. Trekkers are encouraged to respect nature and keep the trail clean throughout the journey. Our expert guides ensure a safe and enriching trekking experience, providing valuable insights into the local ecosystem and history of the region.', 'Day : 0\r\n\r\nDetails :\r\nPickup Points & Timings\r\n• 7:30 PM – Karachi Bakery, Indiranagar\r\n• 7:45 PM – Domlur Skywalk, Domlur\r\n• 9:00 PM – Yeshwantpur Metro Station (towards Tumkur side)\r\n• 9:15 PM – People Tree Hospitals, Goraguntepalya\r\n\r\nDay 1: Trek to Netravathi Peak – Floating Clouds & Mountain Views\r\n\r\nInclusions:\r\n- Non-AC Bus with Reclining Seats\r\n- Homestay on Sharing Basis\r\n- All Meals (Veg Only)\r\n\r\nDay Trek Itinerary – Netravathi Peak\r\n\r\n06:00 AM: Arrive at the campsite.\r\n07:00 AM: Freshen up and enjoy a hearty breakfast.\r\n07:30 AM: Pack your lunch in your personal lunch box.\r\n08:00 AM: Begin the scenic Netravathi Trek from the Forest Checkpost/Base Camp area.\r\n\r\nTrek through dense forests, rolling grasslands, and breathtaking mountain trails. Witness stunning two-tiered waterfalls and panoramic valley views along the route. Catch glimpses of the beautiful Netravathi River flowing through the valley. Cross picturesque grasslands before tackling the steep ascent towards the false peak. Reach the mesmerizing Netravathi Peak summit, often surrounded by dreamy floating clouds.\r\n\r\n01:00 PM: Enjoy a nutritious packed lunch at the peak amidst stunning views.\r\n01:30 PM: Start descending back towards the base.\r\n05:30 PM: Arrive back at the Forest Checkpost/Base Camp.\r\n06:00 PM: Return to the campsite.\r\n07:00 PM: Enjoy hot snacks, crispy bhajias, and coffee at the homestay.\r\n08:30 PM: End the day with a cozy campfire (weather permitting), fun group activities, music, and dinner under the stars.\r\n\r\n\r\nDay 2: Divine and Serene Day\r\n\r\nInclusions:\r\n- Non-AC Bus with Reclining Seats\r\n- Breakfast (Veg Only)\r\n\r\nItinerary:\r\n\r\n07:00 AM: Wake up and freshen up amidst the refreshing mountain atmosphere.\r\n08:00 AM: Savor a delicious breakfast at the homestay.\r\n09:00 AM: Check out from the homestay and board the vehicle for the return journey.\r\n09:30 AM: Explore the scenic beauty of the iconic Samse Tea Estate.\r\n10:30 AM: Visit the picturesque Kalasa Hanging Bridge and seek blessings at the famous Kalaseshwara Temple.\r\n01:30 PM: Explore the architectural marvel of the historic Belur Chennakeshava Temple.\r\n02:00 PM: Stop for a self-sponsored lunch en route.\r\n06:00 PM: Enjoy a refreshing self-sponsored coffee/snack break during the journey.\r\n10:00 PM: Arrive back in Bangalore with unforgettable memories of the adventure.', '2 Days ', 1, 'Moderate', '10 KM', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-25 11:50:48', '2026-10-07 10:49:12'),
(2, 'kudremukh', 'Kudremukh Peak Trek', 1, 'Jeep trail, waterfall stop and a sunset from the temple ridge you won\'t forget.\r\n', 'Kudremukh Peak, located in the heart of Karnataka’s Western Ghats, is a breathtaking trekking destination, renowned for its stunning natural beauty and peaceful surroundings. The name Kudremukh comes from the Kannada words \"Kudre\" meaning horse and \"Mukha\" meaning face, referring to the unique shape of the peak, which resembles the face of a horse when viewed from a particular angle. Covered in lush greenery, the peak offers mesmerizing landscapes that stay with you forever. As the third highest peak in Karnataka, it provides a perfect challenge for adventure lovers, while also being a nature lover\'s paradise.This moderately challenging trek spans about 22 kilometers and is an ideal weekend escape for those seeking adventure. As you make your way to the summit, you’ll cross vast expanses of green meadows, patches of dense forest, and scenic streams, making for a truly immersive nature experience.We ensure that Kudremukh remains a pristine environment by upholding a strict plastic-free and litter-free policy. We ask all trekkers to respect the surroundings and maintain cleanliness throughout the trek. With our expert trekking guides, you’ll be able to enjoy the full beauty of this natural haven, ensuring your safety and comfort along the way.', 'Day : 0\r\n\r\nDetails :\r\nPickup Points & Timings\r\n• 7:30 PM – Karachi Bakery, Indiranagar\r\n• 7:45 PM – Domlur Skywalk, Domlur\r\n• 9:00 PM – Yeshwantpur Metro Station (towards Tumkur side)\r\n• 9:15 PM – People Tree Hospitals, Goraguntepalya\r\n\r\nDay 1 – Trek to the Kuduremukha Peak enjoying fantastic views\r\n\r\nInclusions:\r\n- Non-AC Bus with Reclining Seats\r\n- Homestay on Sharing Basis\r\n- All Meals (Veg Only)\r\n\r\nDay Trek Itinerary – Kudremukh Peak\r\n\r\n6:00 AM – Arrive at the campsite and freshen up\r\n7:00 AM – Enjoy a wholesome breakfast to gear up for the adventure\r\n7:30 AM – Pack your lunch in your personal lunch box\r\n8:00 AM – Begin an exciting jeep ride to the Forest Checkpost/Base at\r\nMullodi, the starting point of the Kudremukh trek\r\n\r\nStart the trek with a gradual ascent through lush forest trails towards the\r\nfamous Ontimara (Lone Tree)\r\nContinue through steeper sections as the trail opens into breathtaking\r\ngrasslands and ridge views\r\nExperience the spectacular ridge walk leading to the majestic Kudremukh\r\nPeak summit\r\nWitness panoramic views of rolling hills, dense forests, and mist-covered\r\nvalleys along the way\r\n\r\n1:00 PM – Enjoy your packed lunch at the peak amidst stunning landscapes\r\n1:30 PM – Begin the descent back towards the base camp\r\n5:30 PM – Reach the Forest Checkpost/Base at Mullodi\r\n6:00 PM – Return to the campsite via jeep ride\r\n7:00 PM – Relish hot snacks, crispy bhajias, and coffee at the homestay\r\n8:30 PM – Unwind around a cozy campfire (weather permitting), enjoy fun\r\ngroup activities, music, and a delicious dinner under the stars\r\n\r\nDay 2 – Divine and Serene Day\r\n\r\nInclusions:\r\n- Non-AC Bus with Reclining Seats\r\n- Breakfast (Veg Only)\r\n\r\nItinerary:\r\n6:00 AM – Wake up and freshen up amidst the serene surroundings\r\n7:00 AM – Visit the beautiful Somavati Waterfalls and enjoy a refreshing\r\nsplash in nature\r\n8:00 AM – Relish a delicious breakfast at the homestay\r\n9:00 AM – Check out from the homestay and board the vehicle for the\r\nreturn journey\r\n9:30 AM – Explore the lush greenery and scenic charm of the iconic Samse\r\nTea Estate\r\n1:30 PM – Visit the magnificent Belur Chennakeshava Temple, renowned for\r\nits stunning Hoysala architecture\r\n2:00 PM – Halt for a self-sponsored lunch en route\r\n6:00 PM – Enjoy a refreshing self-sponsored coffee/snack break during the\r\njourney\r\n10:00 PM – Arrive back in Bangalore with unforgettable trekking memories', '2 Days', 1, 'Easy', '22 KM', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-25 12:15:31', '2026-10-08 16:53:42'),
(3, 'kurinjal', 'Kurinjal Peak Trek', 1, 'dense tropical forests, River crossing, colorful wildflowers dotting the landscape', 'Kurinjal Peak, located within the Kudremukh National Park in Karnataka, is a hidden gem for trekking enthusiasts seeking an offbeat adventure. The peak, standing at an altitude of around 1,100 meters, provides breathtaking views of the surrounding landscapes and is ideal for nature lovers, bird watchers, and adventure seekers alike.The Kurinjal Peak trek is of moderate difficulty and stretches for about 7-8 kilometers one way. The trail takes you through dense tropical forests, meadows, and rocky terrains, offering a diverse trekking experience. Along the way, trekkers can spot a variety of wildlife, including birds, butterflies, and occasionally even larger mammals like deer. The trail is also rich in flora, with towering trees and colorful wildflowers dotting the landscape.The trek also offers an opportunity to explore the biodiversity of the Kudremukh National Park, which is a UNESCO World Heritage Site. Trekkers are encouraged to respect the environment by adhering to eco-friendly practices, including a strict plastic-free policy. Our expert guides ensure a safe and enjoyable trekking experience, providing valuable insights into the local ecology and wildlife.', 'Day : 0\r\n\r\nName : Day 0 – Start from Bangalore\r\n\r\nDetails :Pickup Points & Timings ∙\r\n\r\n7 :30 PM -Karachi Bakery – Indiranagar. ∙\r\n7:45 PM -Domlur Sky Walk - Domlur . ∙\r\n9:00 PM-Yeshwantpur metro station towards Tumkur. ∙\r\n9:15 PM -People Tree Hospitals-Gorguntepalya .\r\n\r\n\r\nDay : 0\r\n\r\nName : Day 1 – Trek to the Kurinjal Peak\r\n\r\nDetails :\r\n06:00 AM – Arrive at the Campsite\r\nFreshen up and relax amidst the peaceful surroundings of the campsite.\r\n07:00 AM – Breakfast\r\nKickstart the day with a delicious and energizing breakfast.\r\n07:30 AM – Pack Your Lunch\r\nPack your lunch boxes and get ready for the adventure ahead.\r\n08:00 AM – Begin the Scenic Kurinjal Trek\r\n\r\nStart the trek from the Forest Office near Bhagavathi Nature Camp and journey through dense forests, serene streams, and beautiful grasslands. Cross charming river sections and conquer steep stretches as you make your way towards the breathtaking Kurinjal Peak. Enjoy mesmerizing views and mist-covered landscapes along the trail.\r\n\r\n01:00 PM – Packed Lunch at the Peak\r\nRelax at the summit and enjoy a wholesome packed lunch surrounded by stunning panoramic views.\r\n01:30 PM – Begin the Descent\r\nStart descending through the scenic trail back towards the forest base.\r\n05:30 PM – Reach the Forest Base\r\nArrive back at the Forest Office after completing the trek.\r\n06:00 PM – Return to the Campsite\r\nReach the homestay and unwind after an adventurous day.\r\n07:00 PM – Evening Snacks & Coffee\r\nEnjoy tasty snacks paired with hot coffee amidst the refreshing mountain atmosphere.\r\n08:30 PM – Campfire & Dinner\r\nGather around the campfire (subject to weather conditions), participate in fun team-building activities, enjoy a delicious dinner under the stars, and wrap up the day with unforgettable memories.\r\n\r\n\r\nDay : 2\r\n\r\nName : Day 2 – Divine and Serene Day\r\n\r\nDetails :\r\n06:00 AM – Wake Up & Freshen Up\r\nStart your morning amidst the calm and refreshing atmosphere of the Western Ghats.\r\n07:00 AM – Stream Play\r\nEnjoy some relaxing moments by the stream and soak in the beauty of nature.\r\n08:00 AM – Breakfast\r\nRelish a hearty breakfast before beginning the return journey.\r\n09:00 AM – Check Out & Departure\r\nCheck out from the homestay and board the bus for the day’s sightseeing.\r\n10:30 AM – Kalasa Hanging Bridge & Kalasa Temple\r\nVisit the iconic hanging bridge at Kalasa followed by a stop at the famous Kalasa Temple, known for its spiritual and cultural significance.\r\n01:30 PM – Explore Belur Temple\r\nDiscover the architectural brilliance of the historic Belur Temple, one of the finest examples of Hoysala craftsmanship.\r\n02:00 PM – Lunch Break (Self-Sponsored)\r\nEnjoy lunch at a local restaurant during the journey back.\r\n06:00 PM – Coffee Break (Self-Sponsored)\r\nPause for refreshments and enjoy a relaxing coffee break en route.\r\n10:00 PM – Reach Bangalore\r\nArrive back in Bangalore with unforgettable memories and amazing experiences from the trek.', '2 Days', 1, 'Easy', '10 KM', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-25 12:59:01', '2026-10-07 10:49:12'),
(4, 'gangadikal', 'Gangadikal Peak Trek', 1, 'panoramic views, dense forests, mist-covered valleys,stunning 360-degree view of the Western Ghats', 'Gangadikal Peak, located in the Kudremukh National Park of Karnataka, is a hidden treasure for trekking enthusiasts and nature lovers. At an elevation of approximately 1,700 meters, Gangadikal provides trekkers with panoramic views of the surrounding mountains, dense forests, and mist-covered valleys, making it a must-visit for those looking to explore the beauty of Karnataka’s wilderness. The trail is also known for its diverse flora, with vibrant wildflowers and towering trees adding to the scenic beauty. The summit of Gangadikal offers a stunning 360-degree view of the Western Ghats, making the journey to the top truly worthwhile.The trek to Gangadikal Peak is moderately challenging, covering a distance of around 10-12 kilometers one way. The trail takes you through a diverse landscape of rolling meadows, rocky terrains, and thick forests, giving trekkers a rich experience of the Western Ghats\' varied ecology. In keeping with the preservation of the pristine environment, Gangadikal is a plastic-free and litter-free zone. Trekkers are expected to maintain cleanliness throughout the trek and respect the natural surroundings. Our experienced guides ensure a safe and enjoyable trek, providing insights into the region’s rich biodiversity and helping you navigate the trails.', 'Day : 0\r\n\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\n \r\n7:30 PM – Pickup from Karachi Bakery, Indiranagar\r\n7:45 PM – Pickup from Domlur Skywalk\r\n9:00 PM – Pickup from Yeshwantpur Metro Station (Tumkur side)\r\n9:15 PM – Pickup from People Tree Hospital, Goraguntepalya\r\nOvernight journey to the Kudremukh region (~8–9 hours)\r\n\r\n\r\nDay : 1\r\n\r\nName : Gangadikal Peak Trek\r\n\r\nDetails :\r\n06:30 AM – Arrive at the homestay nestled amidst the Western Ghats. Freshen up, relax for a while, and enjoy a delicious homemade breakfast to energize yourself for the adventure ahead.\r\n08:30 AM – Depart from the homestay and drive towards the Gangadikal trek base, a scenic journey of approximately 30 minutes through lush greenery and winding hill roads.\r\n09:00 AM – Begin your thrilling trek to Gangadikal Peak. Traverse through dense forests, serene grasslands, refreshing water streams, and mist-covered trails while soaking in the untouched beauty of the Kudremukh region.\r\n02:00 PM – Reach the breathtaking summit of Gangadikal Peak. Spend time admiring the panoramic views of the surrounding valleys and rolling hills while enjoying a packed lunch amidst nature.\r\n03:30 PM – Start the descent back to the trek base, retracing the scenic trail through the tranquil wilderness.\r\n05:30 PM – Return to the homestay and unwind with hot tea and evening snacks after an adventurous day in the mountains.\r\n08:00 PM – Gather around for a cozy campfire experience followed by a wholesome dinner. Enjoy music, conversations, and stargazing under the open sky (subject to weather conditions).\r\n\r\n\r\nDay : 2\r\n\r\nName : Water stream, Kalasa Hanging Bridge, Kalasa temple and Belur temple Visit & Return\r\n\r\nDetails :\r\n07:00 AM – Wake up to the refreshing mountain air and enjoy a hearty breakfast at the homestay.\r\n08:00 AM – Head out to a nearby natural water stream and spend some relaxing time amidst the serene surroundings of the Western Ghats.\r\n09:30 AM – Return to the homestay, freshen up, and get ready for the day ahead.\r\n09:45 AM – Visit the picturesque Samse Tea Estate, surrounded by rolling green plantations and misty landscapes perfect for photography and relaxation.\r\n10:30 AM – Explore the scenic Kalasa Hanging Bridge followed by a visit to the sacred Kalaseshwara Temple.\r\n12:00 PM – Begin the return journey towards Bangalore with beautiful countryside views along the way.\r\n02:30 PM – Stop for a self-sponsored lunch at a highway restaurant en route.\r\n03:30 PM – Visit the magnificent Belur Chennakeshava Temple, renowned for its stunning Hoysala architecture and intricate carvings.\r\n10:00 PM – Arrive back in Bangalore with unforgettable memories of your Gangadikal adventure.', '2 Days', 2, 'Easy', '8 KM', 3340.00, 1999.00, 3340.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-25 13:09:06', '2026-10-07 10:49:12'),
(5, 'bandaje', 'Bandaje Arbi trek, Balarayanadurga fort and Rani Jhari', 1, 'Dense forests, grasslands, Water Fall, Rocks', 'One of the most spectacular waterfalls in Karnataka that is about 200 feet high plunge nestled in Belthangady taluk of Dakshina Kannada district is a must to visit attraction in the state. Nestled in the lap of dense forests and grasslands, the waterfalls can be reached only by trekking and is worth it. Immerse in the beauty of lush green dense forests, mesmerising Ghats, breath-taking sunsets, melodies of the chirping birds and the fragrance of wild flora only at the trek route towards the Bandaje falls.Take a road and trek the trail that is less travelled and chase those gushing Bandaje waterfalls.A paradise for the nature lover, a photographer’s delight and a dream trek for a trekker, Bandaje falls and the Ballarayanadurga Trek is sure to be visited again and again. The serene and panoramic landscapes will ensure that everyone who visits will have a ball of a time. A drive to Bandaje falls crossing the Charmadi Ghats of the Western Ghats, is a must-to-do while in Karnataka and en route to Chikkamagalur. To visit the falls and trek&nbsp; one needs to take forest permission from the kalasa range office in Koppa division. The trek and the falls are a visual treat to the eyes. Due to dense forest and permission issues, there are no permanent accommodations available. However, you can have the option of camping. Ensure you travel with a reliable tour organiser and a guide. Soak up in the beauty of the starry night with a cool breeze staying in a camp amidst dense forest.The best part of Bandaje falls is that the route to reach is less- travelled as the trek trail is a strenuous one. Trekking is the only way to reach the falls and if one is dedicated and determined, loves nature and is comparatively fit can reach the final destination. Yes, to reach the falls one must ensure physical fitness as the trek requires a lot of energy. The waterfalls continue to flow as a single stream and join the river Netravathi as a tributary and are worth all the efforts for that surreal sight.The mesmerising sight intensifies during the sunset. The various hues of the sky when merging with the roaring shining waterfalls in the backdrop of lush greenery, the whole setting is beyond imagination. The unexplored and untouched beauty should surely be on the bucket list of every adventure seeker and nature lover.', 'Day : 0\r\n\r\nName : Day 0 – Night Departure\r\n\r\nDetails :\r\nFollowing are the pick-up points & timings\r\nPickup Points:\r\n\r\n07:00 PM – Karachi Bakery, Indiranagar\r\n07:35 PM – Domlur Skywalk\r\n08:30 PM – Yeshwantpur Metro (Tumkur side)\r\n08:45 PM – People Tree Hospital, Goraguntepalya\r\n→ Overnight Journey to Bandaje Base Village\r\n\r\nDay : 1\r\n\r\nName : Day 1\r\n\r\nHighlight :\r\nWaterfall Trek & Fort Views\r\n\r\nDetails :\r\n06:00 AM: Arrive at the homestay, freshen up, and relax for a while\r\n07:30 AM: Enjoy a hot and delicious breakfast\r\n08:30 AM: Begin the trek to Bandaje Arbi Falls through lush rainforests and scenic trails\r\n12:30 PM: Take a break and enjoy a packed lunch amidst nature\r\n01:30 PM: Explore the historic Ballalarayana Durga Fort during the descent while soaking in panoramic valley views\r\n05:00 PM: Return to the homestay and unwind\r\n08:00 PM: Relish a hearty dinner followed by campfire sessions and relaxing group time (subject to weather conditions)\r\n\r\nOvernight Stay: Comfortable stay at the homestay surrounded by nature\r\n\r\n\r\nDay : 2\r\n\r\nName : Day 2\r\n\r\nHighlight :\r\nStream Play, Culture & Return\r\n\r\nDetails :\r\n07:00 AM: Wake up, freshen up, and enjoy streamside time near the homestay amidst nature\r\n08:30 AM: Have a delicious breakfast at the stay\r\n09:30 AM: Visit the scenic Samse Tea Estate and explore the beautiful Hanging Bridge in Kalasa\r\n01:00 PM: Stop for a self-sponsored lunch during the journey\r\n03:00 PM: Explore the historic Chennakeshava Temple, a masterpiece of Hoysala architecture\r\n10:00 PM: Arrive back in Bangalore with unforgettable memories of the trip', '2 Days', 2, 'Easy', '15 KM', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-25 13:24:36', '2026-10-07 10:49:12'),
(9, 'kodachadri', 'KODACHADRI HIDLUMANE FALLS TREK & OFF-ROAD JEEP ADVENTURE', 1, 'it was jeep ride and water falls dense forest like this and grass land', '### Kodachadri & Hidlumane Falls Adventure\r\n\r\nExperience the breathtaking beauty of the Western Ghats with an adventurous trip to **Kodachadri and Hidlumane Falls**, surrounded by lush forests, misty mountains, cascading waterfalls, and stunning panoramic views.\r\n\r\nLocated in Shivamogga district, Kodachadri rises to an altitude of **1,343 metres (4,406 feet)** and is nestled within the Mookambika Wildlife Sanctuary. The journey takes you through dense tropical forests, rocky trails, open grasslands, and scenic mountain landscapes, with spectacular views of the surrounding hills and, on clear days, the distant Arabian Sea.\r\n\r\nThe adventure also includes a trek to **Hidlumane Falls**, a beautiful multi-tiered waterfall hidden within the forest near Bellakka village. The trek passes through areca plantations, dense jungle trails, slippery rocks, and steep sections, making it an exciting experience for adventure and nature lovers.\r\n\r\nAt Kodachadri, explore the serene **Sarvajna Peetha**, traditionally associated with Adi Shankaracharya, and take in the peaceful surroundings of the Western Ghats. The combination of trekking, waterfalls, forests, mountain views, and spiritual significance makes this trip a memorable escape into nature.\r\n\r\n**Highlights:**\r\n- 🏔️ Trek to the scenic Kodachadri Peak\r\n- 💦 Explore the multi-tiered Hidlumane Falls\r\n- 🌿 Trek through dense Western Ghats forests\r\n- 🌄 Enjoy panoramic mountain and valley views\r\n- 🛕 Visit the historic Sarvajna Peetha\r\n- 📸 Capture beautiful landscapes and waterfall views\r\n- 🌧️ Experience the lush greenery and misty atmosphere of Kodachadri\r\n\r\n**Kodachadri & Hidlumane Falls — an unforgettable blend of adventure, nature, waterfalls, and mountain serenity.**', '**Day : 1**\r\n\r\n**Name : Friday Night Departure**\r\n\r\n**Details :**  \r\nDay 0 – Friday Night Departure  \r\n07:30 PM – Pickup from Indiranagar Metro Station  \r\n07:50 PM – Pickup from Domlur Skywalk  \r\n09:00 PM – Pickup from Yeshwanthpur (Hallimane Hotel near Metro Station)  \r\n09:30 PM – Pickup from Goraguntepalya (People Tree Hospital)  \r\nDinner break en route (Self-Sponsored)  \r\nMeet fellow trekkers and begin the journey towards the Western Ghats.  \r\nOvernight journey to the trek base.\r\n\r\n**Day 0 Highlights**  \r\nComfortable Overnight Journey  \r\nMeet Like-Minded Travelers  \r\nScenic Drive Through the Western Ghats  \r\nAdventure Begins Here! 🌿🚙⛰️\r\n\r\n**Day : 1**\r\n\r\n**Name : Hidlumane Falls Trek and Jeep Adventure**\r\n\r\n**Details :**  \r\n07:00 AM – Reach Homestay and freshen up  \r\n08:30 AM – Enjoy a traditional Malnad breakfast  \r\n09:00 AM – Begin the Hidlumane Falls Trek through dense forests, stream crossings, and scenic trails  \r\n11:00 AM – Reach Hidlumane Falls, relax, enjoy the waterfall, and capture memorable photos  \r\n01:00 PM – Packed lunch or lunch at the campsite depending on the schedule  \r\n02:00 PM – Start the thrilling Off-Road Jeep Adventure  \r\nVisit:  \r\nShankaracharya Peeta  \r\nRolling Green Hills  \r\nMookambika Temple View Point  \r\nHilltop Viewpoints  \r\nEnjoy breathtaking views of the Western Ghats covered in monsoon mist  \r\n04:30 PM – Return to the base by jeep  \r\n05:30 PM – Tea and snacks  \r\nRelax at the homestay and enjoy the peaceful surroundings  \r\n08:30 PM – Dinner  \r\nCampfire and group activities (weather permitting)  \r\nOvernight stay\r\n\r\n**Day : 2**\r\n\r\n**Name : Devagange Pond and Nagara Fort Exploration**\r\n\r\n**Details :**  \r\n06:00 AM – Wake up and enjoy the fresh mountain air  \r\n07:00 AM – Get ready and pack up  \r\n07:30 AM – Breakfast  \r\n08:00 AM – Check out from the homestay  \r\n09:00 AM – Visit Devagange Pond and explore the serene surroundings  \r\nEnjoy photography and spend some time amidst nature  \r\n11:00 AM – Proceed towards the historic Nagara Fort  \r\nExplore the fort ruins and learn about its rich history  \r\nCapture panoramic views of the surrounding landscapes  \r\n02:00 PM – Lunch stop en route (Self-Sponsored)  \r\n03:00 PM – Begin return journey to Bengaluru  \r\nDinner stop en route if required (Self-Sponsored)  \r\n10:00 PM – Reach Bengaluru with unforgettable memories', '2 Days', 2, 'Moderate', '10 KM ', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-07 11:04:20', '2026-10-07 11:04:20'),
(6, 'kumaraparvatha', 'Kumaraparvatha Trek Via Kukke', 1, 'Dense Forset, Sunrise, WaterFalls, Lush green Grass land, iconic Battara Mane', 'Kumaraparvatha, also known as Pushpagiri, is the fifth-highest peak in Karnataka and the highest in the Pushpagiri Wildlife Sanctuary. Towering at 1,712 meters, it is one of the most sought-after trekking destinations in South India. Located on the border of Kodagu, Dakshina Kannada, and Hassan districts, the trek is a true test of endurance—rewarding adventurers with dense forests, scenic ridges, rocky terrains, and breathtaking views from the peak.\r\n\r\nThe trail has two main approaches—Kukke Subramanya (Western entrance) and Beedehalli (Eastern entrance). The Kukke Subramanya route is the most popular, taking trekkers through Battaramane, Kallu Mantapa, Shesha Parvatha, and finally to the majestic Kumaraparvatha peak.\r\n\r\nIf you are looking for a challenging trek filled with stunning views, raw nature, and spiritual vibes near the famous Kukke Subramanya temple, this is the one for you!', 'Day : 0\r\n\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\nPick-up points & timings:\r\n\r\n10:00 PM – Indiranagar (Karachi Bakery)\r\n10:15 PM – Domlur (Sky walk)\r\n10:45 PM – Yeshwantpur (A side metro station)\r\n11:00 PM – Goraguntepalya (Peepal tree Hospital)\r\n\r\n \r\n\r\n\r\nDay : 1\r\n\r\nName : Trek to Kumaraparvatha\r\n\r\nDetails :\r\n05:00 AM – Reach Kukke Subramanya\r\nFreshen up & Breakfast (or packed in your own steel box)\r\n06:00 AM – Start trek\r\n09:00 AM – Reach Bhatru Mane Check Post\r\n10:30 AM – Kallu Mantapa\r\n11:30 AM – Shesha Parvatha\r\n12:30 PM – Reach Kumara Parvatha Peak (Lunch en route)\r\n03:00 PM – Descend to Bhatru Mane / Check post\r\n06:00 PM – Reach Kukke Subramanya\r\n\r\nDinner & overnight stay in rooms\r\n\r\nDay : 2\r\n\r\nName : Return to Bangalore\r\n\r\nDetails :\r\n07:00 AM – Wake up & breakfast\r\nVisit Manjarabad Fort (Sakaleshpura)\r\nExplore Koravangala Hoysala Temple, Hassan\r\n(If time permits) Markonahalli Dam Sunset\r\n07:00–08:00 PM – Reach Bengaluru', '2 Days', 1, 'Hard', '28 KM', 3499.00, 1999.00, 3499.00, NULL, NULL, NULL, 'plain', 1, NULL, NULL, 'published', '2026-09-26 13:33:41', '2026-10-08 16:55:24'),
(7, 'kyathanmakki', 'Kyathanmakki Trek', 1, 'Off Roading, Mesmerizing View, Cave Exploration, Water stream crossing', 'Hidden amidst the lush landscapes of the Western Ghats near Kalasa, Kyatanamakki Trek is one of Karnataka\'s most beautiful ridge treks. Unlike dense forest treks, Kyatanamakki rewards trekkers with endless rolling grasslands, breathtaking mountain ridges, mist-covered valleys, and panoramic views stretching as far as the eye can see.\r\n\r\nThe trail passes through scenic meadows, shola forests, fresh mountain streams, and untouched wilderness, making it an unforgettable experience for nature lovers, photographers, and adventure seekers alike.\r\n\r\nWhether you\'re looking to escape the busy city life, witness spectacular sunrise views, or simply spend a weekend amidst nature, Kyatanamakki is the perfect destination.', 'Day : 0\r\n\r\nName : Departure from Bengaluru\r\n\r\nHighlight :\r\nBegin your weekend adventure with an overnight journey from Bengaluru to the beautiful Western Ghats.\r\n\r\nDetails :\r\nPickup Schedule\r\n\r\nIndiranagar – 7:30 PM\r\nDomlur – 7:45 PM\r\nYeshwanthpur Metro Station – 9:00 PM\r\nGoraguntepalya – 9:15 PM\r\n\r\nDay : 1\r\n\r\nName : Saturday | Kyatanamakki Ridge Trek\r\n\r\nDetails :\r\n06:00 AM – Reach the homestay.\r\nFreshen up, relax, and enjoy the cool mountain weather before beginning the day\'s adventure.\r\n07:00 AM – Breakfast\r\nA freshly prepared local breakfast will be served at the homestay.\r\n07:30 AM – Jeep Ride to Trek Base\r\nBoard local jeeps for an exciting off-road ride through forest trails and rugged terrain to reach the official trekking starting point.\r\n08:00 AM – Begin the Kyatanamakki Trek\r\n\r\nThe trek starts through lush green grasslands, rolling hills, and scenic mountain ridges. As you gain altitude, enjoy uninterrupted panoramic views of the Western Ghats, mist-covered valleys, dense forests, and surrounding peaks.\r\nThroughout the trek, the trek leader will guide the group while sharing interesting information about the region\'s flora, fauna, and local ecosystem.\r\nThere will be multiple short breaks to rest, hydrate, and capture photographs at some of the most scenic viewpoints along the trail.\r\n\r\n01:00 PM – Packed Lunch\r\nEnjoy a packed lunch amidst nature while taking in the breathtaking mountain views before continuing the trek.\r\n01:45 PM – 05:30 PM\r\nResume the trek and explore more spectacular viewpoints, ridge walks, and rolling meadows. During the return journey, spend some time at a natural stream (subject to water flow and weather conditions) to relax and enjoy the refreshing mountain waters.\r\n06:30 PM – Return to Trek Base\r\nComplete the trek and return by jeep to the homestay.\r\n07:30 PM – Evening Snacks, Tea/Coffee & Campfire\r\nFreshen up and enjoy hot tea or coffee with evening snacks. If weather conditions permit, gather around a campfire to unwind, interact with fellow trekkers, share travel experiences, and enjoy a peaceful evening amidst nature.\r\n09:00 PM – Dinner\r\nA wholesome vegetarian dinner will be served at the homestay.\r\n\r\nOvernight stay at the homestay.\r\n\r\nDay : 2\r\n\r\nName : Sunday | Kalasa & Belur Sightseeing\r\n\r\nDetails :\r\n07:00 AM – Wake Up\r\nFreshen up and prepare for the day\'s sightseeing.\r\n07:30 AM – Breakfast\r\nEnjoy breakfast before checking out of the homestay.\r\n08:00 AM – Check-out\r\nPack your belongings and begin the return journey towards Bengaluru with sightseeing stops along the way.\r\n\r\n8:15 AM - Visit to Soormane falls (entry fee excluded). Perfect place to play in waterfall.\r\n\r\n09:00 AM – Visit Kalasa Hanging Bridge\r\n\r\nSpend time at the picturesque hanging bridge built across the Bhadra River. The bridge offers beautiful views of the surrounding hills and is a great spot for photography.\r\n\r\n10:00 AM – Visit Sri Kalaseshwara Temple\r\n\r\nVisit the ancient Sri Kalaseshwara Temple, one of the most revered temples dedicated to Lord Shiva in Karnataka. The temple is known for its rich history, peaceful atmosphere, and traditional architecture.\r\n\r\n11:30 AM – Depart towards Belur\r\n\r\nEnjoy a scenic drive through the coffee plantations and countryside of Chikkamagaluru district.\r\n\r\n01:30 PM – Visit Belur Chennakesava Temple\r\n\r\nExplore the magnificent Chennakesava Temple at Belur, an architectural masterpiece built during the Hoysala Empire. Admire its intricate stone carvings, detailed sculptures, and remarkable craftsmanship that make it one of Karnataka\'s most celebrated heritage monuments.\r\n\r\nLunch can be had at a nearby restaurant (self-sponsored).\r\n\r\n03:30 PM – Begin Return Journey\r\n\r\nAfter sightseeing, start the return journey to Bengaluru with short refreshment breaks en route.\r\n\r\n10:00 PM – Reach Bengaluru\r\n\r\nArrive back in Bengaluru with unforgettable memories, beautiful photographs, and an enriching trekking experience in the Western Ghats.\r\n\r\nNote: Arrival time may vary depending on weather, road conditions, and traffic.', '2 Days', 1, 'Easy', '10 KM', 3340.00, 1999.00, 3340.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-26 13:45:09', '2026-10-07 10:49:12'),
(8, 'dudhsagar', 'Dudhsagar Waterfalls Trek and Yellapura Sightseeing ', 1, 'Waterfalls, Dense Forest, River crossing, Temple Exploration', 'Experience one of the most scenic monsoon adventures in South India. Trek through dense forests, railway tracks, streams, and lush greenery to witness the majestic Dudhsagar Waterfalls. Combine this with the beautiful viewpoints of Yellapura, the stunning Magod Falls, and a visit to the famous Marikamba Temple at Sirsi.\r\n\r\nThis is an easy-grade adventure suitable for beginners and nature lovers looking for a refreshing weekend getaway.', 'Day : 0\r\n\r\nName : Departure from Bengaluru towards Dudhsagar base\r\n\r\nDetails :\r\nPick up timings\r\n\r\n05:00 PM - Majestic Metro (Shanthala Silks)\r\n05:45 PM - Yeshwanthpur Metro (Hallimane Hotel)\r\n06:00 PM - Goraguntepalya (People Tree Hospital)\r\nAdditional pickups available en route towards Tumakuru\r\nDinner stop (self-sponsored)\r\nOvernight journey towards Dudhsagar\r\n\r\nDay : 1\r\n\r\nName : Saturday | Dudhsagar Waterfalls Trek\r\n\r\nDetails :\r\nReach Mollem, Goa Border\r\nTransfer to Dudhsagar Base Camp\r\nFreshen up and breakfast\r\nBegin trek towards Dudhsagar Waterfalls\r\nTrek through forests, streams, and railway tracks\r\nReach Dudhsagar View Point and Watch Tower\r\nEnjoy packed lunch amidst nature\r\nBegin return trek\r\nComplete trek by evening\r\nTransfer to stay\r\nDinner\r\nCampfire (weather permitting)\r\nOvernight stay\r\n\r\nDay : 2\r\n\r\nName : Sunday | Yellapura Sightseeing\r\n\r\nDetails :\r\nWake up and freshen up\r\nBreakfast\r\nCheck out from stay\r\nDrive towards Yellapura\r\nVisit Magod Falls\r\nVisit Jenkallu Gudda View Point\r\nSelf-sponsored lunch\r\nVisit Sirsi Marikamba Temple\r\nBegin return journey to Bengaluru\r\nDinner stop (self-sponsored)\r\nOvernight travel\r\n\r\nDay : 3\r\n\r\nName : Back to Bangalore\r\n\r\nDetails :\r\nReach Bengaluru around 6:30 AM\r\nTrip concludes', '2 Days', 1, 'Hard', '22 KM', 5500.00, 2496.00, 5500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-09-26 13:57:25', '2026-10-07 10:49:12'),
(10, 'bhavikonda', 'Bhavikonda Trek and Somavathi waterfalls exploration', 1, 'Grassland, Waterfalls, jeepride, flowers, ', 'The Bhavikonda Trek is a hidden gem in the Western Ghats, offering breathtaking views, lush forests, rolling grasslands, and a peaceful trekking experience away from crowded trails. Ideal for nature lovers and adventure enthusiasts, this trek takes you through pristine landscapes and untouched wilderness.\r\n\r\nA major highlight of the trek is the spectacular viewpoint that offers panoramic views of both the majestic Netravathi Peak and Kudremukha Peak. The experience is further enhanced with a visit to the beautiful Somavathi Falls, a serene waterfall nestled amidst dense greenery, making the journey even more refreshing and memorable.\r\n\r\nExplore the detailed itinerary and book your Bhavikonda Kulchukki Trek adventure today. 🌿🏔️💦', 'Day : 0\r\n\r\nName : Day 0 – Depart to Campsite at Kuduremukha foothills\r\n\r\nDetails :\r\nPickup Points & Timings\r\n• 7:30 PM – Karachi Bakery, Indiranagar\r\n• 7:45 PM – Domlur Skywalk, Domlur\r\n• 9:00 PM – Yeshwantpur Metro Station (towards Tumkur side)\r\n• 9:15 PM – People Tree Hospitals, Goraguntepalya\r\n\r\n\r\nDay : 1\r\n\r\nName : Day 1 – Trek to the Bhavikonda Peak enjoying fantastic views\r\n\r\nDetails :\r\n6:00 AM – Arrive at the campsite and freshen up\r\n7:00 AM – Enjoy a wholesome breakfast to gear up for the adventure\r\n7:30 AM – Pack your lunch in your personal lunch box\r\n8:00 AM – Begin an exciting jeep ride to the Forest Checkpost/Base at Mullodi, the starting point of Bhavikonda Trek\r\nStart the trek with a gradual ascent through lush forest trails towards the Bhavikonda Peak\r\nContinue through steeper sections as the trail opens into breathtaking grasslands and ridge views\r\nExperience the spectacular ridge walk \r\nWitness panoramic views of rolling hills, dense forests, and mist-covered View of Kudremukha peak and Netravathi Peak\r\n12:30 PM – Enjoy your packed lunch at the peak amidst stunning landscapes\r\n1:00 PM – Begin the descent back towards the base camp\r\n2:30 PM – Reach the Somavathi waterfall \r\n5:30 PM – Return to the campsite\r\n6:00 PM – Relish hot snacks, crispy bhajias, and coffee at the homestay\r\n8:30 PM – Unwind around a cozy campfire (weather permitting), enjoy fun group activities, music, and a delicious dinner under the stars\r\n\r\n\r\nDay : 2\r\n\r\nName : Day 2 – Divine and Serene Day\r\nDetails :\r\n7:00 AM – Wake up and freshen up amidst the serene surroundings\r\n8:00 AM – Relish a delicious breakfast at the homestay\r\n9:00 AM – Check out from the homestay and board the vehicle for the return journey\r\n9:30 AM – Explore the lush greenery and scenic charm of the iconic Samse Tea Estate\r\n1:30 PM – Visit the magnificent Belur Chennakeshava Temple, renowned for its stunning Hoysala architecture\r\n2:00 PM – Halt for a self-sponsored lunch en route\r\n6:00 PM – Enjoy a refreshing self-sponsored coffee/snack break during the journey\r\n10:00 PM – Arrive back in Bangalore with unforgettable trekking memories', '2 Days', 1, 'Easy', '8 KM', 3500.00, 1999.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-07 12:44:23', '2026-10-07 12:44:23'),
(11, 'coorg', 'Coorg Weekend Explorer – Monasteries, Waterfalls & View Points', 3, 'Misty Mountains, Off-Road Jeep, Waterfalls, Riverside Forests, Tibetan Monasteries & Culture, Historic Hilltop Forts, Sunset Viewpoints, Campfire Nights', 'Coorg, officially known as Kodagu, is a breathtaking hill station nestled in the Western Ghats of Karnataka. Celebrated as the \"Scotland of India,\" this region is a captivating blend of misty emerald hills, sprawling coffee plantations, and deep valleys that offer an ideal escape for both peace-seekers and adventure enthusiasts.\r\nThe geography of Coorg is defined by its rugged terrains and dense forest reserves. It transitions beautifully from rugged, off-road peaks that offer panoramic, wind-swept views of the Western Ghats to cascading waterfalls hidden deep within lush greenery. The region\'s unique biodiversity is further highlighted by its tranquil reservoirs, bamboo forests, and sanctuaries that serve as a haven for local wildlife.\r\nBeyond its natural beauty, Coorg is a cultural melting pot. It is uniquely home to a vibrant Tibetan settlement, allowing visitors to experience the serene ambiance of ornate monasteries and Buddhist heritage right alongside the distinct traditions of the local Kodava culture. Whether you are catching a golden sunset over the rolling mist of the valleys or gathering around a warm campfire under a clear star-lit sky, Coorg offers an immersive, rejuvenating experience where nature and culture perfectly intertwine.\r\n\r\n[Rich media excluded from paste]\r\n\r\n', 'Day : 0\r\nName : Departure from Bangalore\r\nDetails : Pickup Points & Timings\r\n\r\n10:00 PM – Silk Board\r\n10:20 PM – Koramangala Sony World Signal\r\n10:30 PM – Domlur (Near Licious)\r\n10:50 PM – Corporation Circle\r\n11:10 PM – Mysore Road Metro Station\r\nOvernight journey to Coorg (Madikeri)\r\n\r\n\r\nDay : 1\r\nName : Coorg Sightseeing & Campfire\r\n\r\nDetails :\r\n \r\n06:30 AM – Reach Coorg and check in to the hotel/homestay\r\n07:30 AM – Freshen up and breakfast\r\n09:00 AM – Visit Dubare Elephant Camp (Elephant interaction & optional activities)\r\n11:30 AM – Chiklihole Reservoir (Scenic waterbody and nature photography)\r\n01:00 PM – Lunch (self-sponsored en route or at a local restaurant)\r\n02:00 PM – Visit Namdroling Monastery (Golden Temple) & Tibetan Flea Market\r\n03:30 PM – Explore Nisargadhama Forest Park (Bamboo groves, hanging bridge, deer park, and riverside play)\r\n05:30 PM – Visit Raja’s Seat for sunset and valley views\r\n07:30 PM – Return to stay, freshen up\r\n08:30 PM – Campfire, team-building activities, and group games (weather permitting)\r\n09:30 PM – Dinner and overnight stay\r\n\r\n\r\nDay : 2\r\nName : Adventure & Return via Mysore\r\n\r\nDetails :\r\n06:30 AM – Wake up and freshen up\r\n07:30 AM – Breakfast at the stay\r\n08:30 AM – Depart for Mandalpatti Peak (off-road jeep ride – charges extra)\r\n11:30 AM – Visit Abbey Falls\r\n01:00 PM – Lunch (self-sponsored at Madikeri or en route)\r\n02:30 PM – Madikeri Fort and Museum exploration\r\n04:00 PM – Start journey towards Mysore\r\n06:30 PM – Visit Mysore Palace (Illumination view from outside)\r\n07:30 PM – Return journey to Bangalore\r\n11:30 PM – Reach Bangalore and trip ends with great memories', '2 Days', 2, 'Easy', NULL, 3999.00, NULL, 3999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 05:48:33', '2026-10-09 06:22:44'),
(13, 'netrani', 'Netrani scuba ', 3, 'scuba, beach camping, Iconic shiva satchu, Mangrove Forest, waterfalls', 'Escape the city with TFGW on a power-packed 2-day adventure that blends thrill, nature, and relaxation. Dive into the crystal-clear waters of Netrani Island with scuba diving and snorkeling, explore vibrant marine life, and soak in the true coastal vibe.\r\n\r\nUnwind with a unique beach camping experience under the stars, filled with music, bonfire, and fun group activities. Continue the journey through lush forest trails, serene backwaters, and the breathtaking Jog Falls, making every moment refreshing and memorable.', '**DAY 0 – DEPARTURE FROM BANGALORE**\r\n\r\n**Name:** Departure from Bangalore\r\n\r\n**Details:**  \r\n7:30 PM – Indiranagar (Karachi Bakery)  \r\n7:45 PM – Domlur (Skywalk)  \r\n9:00 PM – Yeshwanthpur Metro Station (Tumkur Side)  \r\n9:15 PM – Goraguntepalya (People Tree Hospital)  \r\nDinner Break (Self-Sponsored)  \r\nOvernight Journey to Murdeshwar\r\n\r\n**DAY 1 – MURDESHWAR & NETRANI ISLAND ADVENTURE**\r\n\r\n**Details:**  \r\n07:00 AM – Campsite Check-in  \r\nArrive at the campsite, freshen up and have breakfast.\r\n\r\n08:30 AM – Transfer to Murdeshwar  \r\n09:30 AM – Arrive at Murdeshwar\r\n\r\n10:30 AM – Netrani Island Marine Adventure  \r\nBoat Ride to Netrani Island  \r\nScuba Diving  \r\nSnorkeling  \r\nUnderwater Photos & Videos\r\n\r\n01:30 PM – Post-Activity Refreshments  \r\nRefreshments and snacks  \r\nFreshen up\r\n\r\n02:30 PM – Murdeshwar Temple Visit (Optional)  \r\nVisit the iconic Murdeshwar Temple  \r\nLift ride to the top of the 249-ft Gopuram  \r\nSubject to time availability\r\n\r\n04:00 PM – Transfer to Private Beach\r\n\r\n05:00 PM – Beach Camping Experience  \r\nCheck-in to the private beach campsite  \r\n2-person tent sharing  \r\nRelax and enjoy the beach\r\n\r\n06:30 PM – Evening Camp Activities  \r\nBonfire/Campfire (Subject to Weather Conditions)  \r\nMusic  \r\nFun Games & Group Activities  \r\nLeisure Time by the Beach\r\n\r\n08:30 PM – Dinner\r\n\r\n10:00 PM – Overnight Stay  \r\nBeach camping in tents.\r\n\r\n**IMPORTANT NOTE:**  \r\nScuba diving and other Netrani Island water activities will be conducted according to the activity slots allotted by the operator. Activity timings may vary depending on the slots provided by the activity operator. The itinerary timings are tentative and subject to change.\r\n\r\n**DAY 2 – HONNAVARA, JOG FALLS & RETURN JOURNEY**\r\n\r\n**Details:**  \r\n06:00 AM – Wake Up & Freshen Up  \r\nFreshen up and have breakfast.\r\n\r\n07:30 AM – Check-out from Campsite\r\n\r\n08:00 AM – Kandla Forest Walk  \r\nExplore the mangrove ecosystem through a scenic nature trail.  \r\nEnjoy the peaceful surroundings and natural landscapes.\r\n\r\n10:00 AM – Honnavara Backwater Boating  \r\nScenic backwater boating experience  \r\nBoating Charges (Self-Sponsored)\r\n\r\n12:30 PM – Lunch Break  \r\nLunch at a local restaurant  \r\nLunch Expenses (Self-Sponsored)\r\n\r\n02:00 PM – Visit Jog Falls  \r\nVisit one of India’s tallest and most spectacular waterfalls.  \r\nEnjoy panoramic views and spend some time at the viewpoint.\r\n\r\n04:30 PM – Start Return Journey to Bangalore\r\n\r\n08:00 PM – Dinner Halt at Sagara  \r\nDinner Break (Self-Sponsored)\r\n\r\n09:00 PM – Continue Journey to Bangalore\r\n\r\n06:00 AM (Next Day) – Arrival in Bangalore  \r\nArrive in Bangalore the following morning.', '2 Days', 2, 'Easy', NULL, 7499.00, 0.00, 7499.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 06:29:07', '2026-10-09 06:29:07'),
(12, 'goa', 'GOA Fun weekend Getaway', 3, 'Beach, heritage, nightlife, adventure, relaxation, local markets, water sports', 'Get ready for an unforgettable Goa getaway combining heritage, beaches, nightlife, adventure and relaxation.\r\n\r\nExplore the historic churches of Old Goa, wander through the colourful streets of Panjim and Fontainhas, enjoy the scenic beauty of Dona Paula and Miramar Beach, cruise along the Mandovi River at sunset, and experience the energetic nightlife of Baga Beach and Tito’s Lane.\r\n\r\nThe second day takes you through North Goa, with time for beaches, local markets, Fort Aguada and optional water sports.\r\n\r\nWhether you\'re travelling solo, with friends or as a couple, this group trip is designed for great experiences, new connections and unforgettable memories.\r\n\r\nOne Community. Limitless Experiences.', 'Day : 0\r\nName : BANGALORE TO GOA\r\n\r\nDetails :\r\nAssemble at the designated pickup points.\r\nDeparture from Bangalore at 7:00 PM.\r\nTravel by AC vehicle towards Goa.\r\nOvernight journey to Goa.\r\nArrive in Goa the following morning and begin the sightseeing program.\r\n\r\nDay : 1\r\nName : SOUTH GOA, PANJIM & SUNSET CRUISE\r\n\r\nDetails :\r\n \r\n08:00 AM – Arrive in Goa and freshen up at common washroom facilities.\r\n09:00 AM – Breakfast.\r\n09:30 AM – Visit the historic Basilica of Bom Jesus.\r\n10:00 AM – Explore Se Cathedral.\r\n11:00 AM – Explore Panjim City and Fontainhas, known for its colourful Portuguese-style streets and heritage architecture.\r\n12:15 PM – Visit Dona Paula View Point.\r\n01:15 PM – Relax and explore Miramar Beach.\r\n02:00 PM – Lunch break at your own expense.\r\n03:00 PM – Leisure time and explore the surrounding areas of Panjim.\r\n04:30 PM – Proceed towards the Mandovi River for the evening cruise.\r\n05:30 PM – 07:00 PM – Enjoy the Mandovi River Sunset Cruise, with sunset views, music and entertainment.\r\n07:00 PM – Depart towards the accommodation near Baga Beach.\r\n08:00 PM – Check-in and freshen up.\r\n08:30 PM onwards – Enjoy 3 complimentary beers per person and party access.\r\n09:00 PM onwards – Experience the nightlife around Baga Beach and Tito’s Lane.\r\nOvernight stay near Baga Beach.\r\nTimings are tentative and may vary depending on traffic, weather, sightseeing duration, cruise schedule and operational conditions.\r\n\r\n\r\nDay : 2\r\nName : NORTH GOA, BEACHES, WATER SPORTS & FORT AGUADA\r\n\r\nDetails :\r\n07:30 AM – Breakfast.\r\n08:30 AM – Check out and proceed for North Goa sightseeing.\r\n09:00 AM – Spend leisure time at Baga Beach.\r\n10:30 AM – Explore Tito’s Lane and nearby local markets.\r\n11:30 AM – Visit Calangute Beach and enjoy some beach time.\r\n12:30 PM – Optional water sports activities such as Parasailing, Jet Ski, Banana Ride, Bumper Ride and Speed Boat Ride.\r\nWater sports are optional and chargeable.\r\n02:00 PM – Lunch break at your own expense.\r\n03:00 PM – Visit Fort Aguada and enjoy the scenic coastal views.\r\n04:00 PM – Begin the return journey from Goa towards Bangalore.\r\n04:00 PM onwards – Overnight journey to Bangalore.\r\nMonday, approximately 05:00 AM – Arrive in Bangalore and conclude the trip.\r\n\r\nTimings are tentative and may vary depending on traffic, weather conditions, sightseeing duration and operational requirements.', '2 Days', 2, '', NULL, 6999.00, 0.00, 6999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 06:12:58', '2026-10-09 06:12:58');
INSERT INTO `trips` (`id`, `slug`, `name`, `category_id`, `blurb`, `description`, `itinerary`, `duration_label`, `duration_days`, `difficulty`, `distance_label`, `price`, `without_transport_price`, `with_transport_price`, `price_note`, `image_path`, `badge_text`, `badge_style`, `is_featured`, `featured_label`, `featured_order`, `status`, `created_at`, `updated_at`) VALUES
(14, 'ooty', 'Ooty and Coonoor', 3, 'Ooty Lake, Doddabetta Peak, Government Botanical Garden, Ooty Tea Factory, Sim\'s Park, Lamb\'s Rock, Dolphin\'s Nose Viewpoint, Nilgiri Mountain Railway', 'Ooty, the lively heart of the Nilgiris, is a bustling mountain hub famous for its colonial heritage, misty lakes, and expansive landscapes. Visitors can explore the massive 55-acre Government Botanical Garden, boat along the scenic waters of Ooty Lake, or take in 360-degree valley views from Doddabetta Peak, the highest point in the region. The town beautifully blends vibrant local markets with the rich agricultural history found at the Ooty Tea Factory.\r\nIn contrast, Coonoor is a quieter, more laid-back haven nestled on a lower ridge, celebrated for its velvet-green tea estates and tranquil pace. It features the beautifully manicured terraces of Sim\'s Park and dramatic vistas from Lamb\'s Rock and Dolphin\'s Nose Viewpoint. Connecting these two distinct towns is the iconic Nilgiri Mountain Railway, a UNESCO World Heritage toy train that winds through tunnels and over tall bridges to offer the ultimate scenic mountain journey.', 'Day : 0\r\nName : Friday Night Departure from Bangalore\r\n\r\nDetails :\r\nIndiranagar Karachi Bakery – 10:30 PM\r\nDomlur Union Bank – 10:15 PM\r\nMysore Road Nayandahalli Metro Station – 10:50 PM\r\nPlease arrive at your selected pickup point 10 to 15 minutes early.\r\n\r\n\r\nDay : 1\r\nName : Arrival and Ooty Exploration\r\n\r\nDetails :\r\n \r\n8:00 AM – Arrival and check-in at the hotel followed by breakfast\r\n10:00 AM – Visit Pykara Lake for a boat ride\r\n12:30 PM – Explore the scenic Pine Forest\r\n3:00 PM – Visit Government Rose Garden\r\n4:30 PM – Explore the Government Botanical Garden and stroll through the local market\r\n7:00 PM – Dinner at the hotel and overnight stay\r\n\r\nDay : 2\r\nName : Ooty and Coonoor Sightseeing\r\n\r\nDetails :\r\n8:00 AM – Breakfast at the hotel\r\n9:30 AM – Visit Doddabetta Peak for breathtaking views\r\n11:00 AM – Take the Toy Train ride to Coonoor\r\n1:00 PM – Visit Sims Park in Coonoor\r\n5:00 PM – Dinner break at a local restaurant (self-sponsored)\r\n6:30 PM – Departure for Bangalore. Arrival around midnight\r\n10:30 PM – Expected time to reach Bangalore', '2 Days', 2, 'Easy', NULL, 5499.00, 0.00, 5499.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 06:41:34', '2026-10-09 06:41:34'),
(15, 'wayanad', 'Wayanad Exploration', 3, 'Tea Plantation, Zipline, Glass bridge, Off road, Jeep Ride, Caves, waterfalls, Hill station', 'Wayanad, located in the heart of the Western Ghats, is a serene hill station in Kerala known for its lush forests, mist-covered mountains, waterfalls, and rich tribal heritage. Sitting at the southern tip of the Deccan Plateau, Wayanad offers an ideal blend of adventure and tranquility. From ancient caves and forest trails to panoramic viewpoints and cultural experiences, this destination is a hidden gem perfect for nature lovers and explorers.', 'Day : 0\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\n10:00 PM: Pickup from Silk Board\r\n10:20 PM: Koramangala Sony World Signal\r\n10:30 PM: Domlur (Near Licious)\r\n10:50 PM: Corporation Circle\r\n11:10 PM: Mysore Road Metro\r\n\r\n\r\nDay : 1\r\nName : Arrival and Sightseeing\r\n\r\nDetails :\r\n7:00 AM: Arrival at Kalpetta\r\n8:00 AM: Freshen up and breakfast\r\n9:00 AM: Visit Banasura Sagar Dam (self-sponsored entry)\r\n11:30 AM: Zipline activity (optional, self-sponsored)\r\n1:00 PM: Lunch break (self-sponsored)\r\n2:00 PM: Meenmutty waterfalls\r\n6:30 PM: Check-in to homestay\r\n7:30 PM: Campfire and music night\r\n9:30 PM: Dinner (included)\r\nOver night stay\r\n\r\nDay : 2\r\nName : Exploration and Return\r\n\r\nDetails :\r\n7:00 AM: Wake up, Freshen up and Breakfast\r\n8:30 AM: Off-road jeep safari and Glass Bridge at 900 Kandi (Self sponsored)\r\n10:30 AM : Visit to Soochipura waterfalls.\r\n1:00 PM: Lunch break (self-sponsored)\r\n2:00 PM: Visit to Edakkal caves\r\n4:00 PM: Departure to Bangalore\r\n11:30 PM: Arrival in Bangalore', '2 Days', 2, 'Easy', NULL, 4999.00, 0.00, 4999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 06:47:42', '2026-10-09 06:47:42'),
(16, 'varkala', 'Varkala & Jatayu', 3, 'cliff, Cafe exploration, Jatayu Earth Center, local culture, soaking in ocean views, mangrove backwaters', 'This backpacking journey to Varkala and Jatayu is designed for travellers who want a perfect blend of nature, culture, relaxation, and slow travel. From overnight road trips and coastal mornings to cliffside sunsets and peaceful backwaters, every moment is thoughtfully planned to give you a refreshing weekend escape from city life.\r\n\r\nWake up to the calm vibes of Varkala, explore ancient temples rich in history, and spend unhurried hours walking along India’s only cliff beach, soaking in ocean views, cafés, and local culture. The experience is relaxed yet immersive, giving you enough free time to explore, unwind, and truly connect with the place.\r\n\r\nThe journey continues with the awe-inspiring Jatayu Earth Center, where breathtaking viewpoints and the world’s largest bird sculpture leave a lasting impression. As the pace slows down, glide through serene mangrove backwaters, surrounded by lush greenery and birdlife—a perfect contrast to the lively beaches.\r\n\r\nTraveling in a small, like-minded group makes the experience more personal and safe, especially for solo and women travellers. With a dedicated Tour Captain, well-planned routing, and no unnecessary rush, this trip is not just about ticking places off a list—it’s about feeling the destination, making connections, and returning refreshed.', 'Day : 0\r\nName : Friday Night (Bangalore)\r\n\r\nDetails :\r\nPickup Points – Friday Night (Bangalore)\r\nAll pickups follow a single route to avoid delays. Please report 10 minutes early at your chosen pickup point.\r\n\r\n7:00 PM – Indiranagar, Karachi Bakery\r\n7:15 PM – Domlur, Licious Headquarters\r\n7:30 PM – Sony World Signal\r\n8:10 PM – Madiwala Police Station\r\n📌 Vehicle number and Tour Captain contact details will be shared on WhatsApp one day prior to departure.\r\n\r\nDay : 1\r\nName : Saturday | Varkala Heritage, Cliff & Beaches\r\n\r\nDetails :\r\nAfter arriving in Varkala early morning, travellers freshen up at a clean local restaurant and enjoy breakfast (self-sponsored).\r\n\r\n7:30 – 8:30 AM: Arrival at Varkala\r\n8:30 – 9:15 AM: Freshen up & Breakfast (self-sponsored)\r\n9:30 – 10:15 AM: Visit Janardanaswamy Temple\r\n10:30 – 11:15 AM: Visit Sivagiri Mutt\r\n11:45 AM – 2:00 PM: Explore Varkala Cliff\r\nCliff viewpoints\r\nCafé hopping & shopping\r\nLeisure walk\r\nLunch at cliff cafés (self-sponsored)\r\n2:15 – 3:15 PM: Visit Varkala Beach\r\nSwimming & relaxation\r\n3:30 – 4:00 PM: Hotel check-in\r\n5:00 – 6:00 PM: Visit Odayam Beach (sunset photography)\r\n6:30 – 7:30 PM: Sunset time at Varkala Cliff\r\n8:00 PM: Dinner\r\nOvernight stay at Varkala\r\n\r\nDay : 2\r\nName : Sunday | Jatayu, Backwaters & Coastal Views\r\n\r\nDetails :\r\n7:00 AM: Breakfast at hotel\r\n8:00 AM: Checkout from hotel\r\n9:30 AM – 12:00 PM: Visit Jatayu Earth Center\r\nWorld’s largest bird sculpture\r\nOptional cable car & viewpoints\r\n1:00 PM: Lunch en route (self-sponsored)\r\n2:30 – 3:30 PM: Mangrove Forest Boating\r\n4:15 – 5:00 PM: Visit Papanasam Beach\r\nIf time permits:\r\nKappil Beach & Backwaters\r\nBlack Sand Beach\r\n5:00 PM: Departure towards Bangalore\r\n\r\nDay : 3\r\nName : Monday Early Morning | Arrival\r\n\r\nDetails :\r\nThe trip concludes with arrival in Bangalore early Monday morning, marking the end of a refreshing weekend backpacking experience.', '2 Days', 2, 'Easy', NULL, 5999.00, 0.00, 5999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 07:08:03', '2026-10-09 07:08:03'),
(17, 'gokarna', 'Gokarna Beach Trek And Honnavar Backwater', 1, 'Beaches, Beach stay, Mangrove Forest, Temple, Boating, ', 'Gokarna, a serene coastal town in northern Karnataka, is known for its blend of spirituality, adventure, and natural beauty. Famous for its pristine beaches and unique trekking trail that connects them, Gokarna offers the perfect balance of calm and thrill. This trip combines beach trekking, camping under the stars, spiritual visits to Murudeshwar Temple, and an optional Honnavar backwater boat ride for an unforgettable coastal escape.', 'Day : 0\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\n7:30 PM – Indiranagar (Karachi Bakery)\r\n7:45 PM – Domlur (Skywalk)\r\n9:00 PM – Yeshwanthpur Metro Station (Tumkur side)\r\n9:15 PM – Goraguntepalya (People Tree Hospital)\r\nOvernight journey to Gokarna by non-AC semi-sleeper bus\r\n\r\nDay : 1\r\nName : Gokarna Beach Trek Adventure\r\n\r\nDetails :\r\n9:00 AM – Arrive at the scenic beachside campsite\r\n10:00 AM – Kickstart your day with a refreshing breakfast\r\n10:30 AM – Scenic ferry ride to Belekan Beach witnessing the Aganashini River merging into the Arabian Sea\r\n11:00 AM – Begin the thrilling Gokarna Beach Trek\r\nExplore the serene Belekan Beach\r\nCatch magical views from Dolphin View Point\r\nUnwind at the secluded Paradise Beach\r\nOptional water sports at Paradise Beach (kayaking, banana ride, jet ski – at own cost)\r\n2:30 PM – Break for a self-sponsored lunch at a local eatery\r\n3:00 PM – Resume trek to\r\nThe peaceful Half Moon Beach\r\nThe iconic Om Beach shaped like the symbol Om\r\nOptional water sports at Om Beach (banana boat ride, jet ski, etc. – at own cost)\r\n6:00 PM – Witness a breathtaking sunset at Om Beach\r\n6:30 PM – Return journey to the campsite\r\n8:30 PM – Campfire session (weather permitting), dinner under the stars, and call it a night\r\n\r\nDay : 2\r\nName : Murudeshwar and Honnavara\r\n\r\nDetails :\r\n7:30 AM – Wake up, freshen up, beach walk\r\n8:00 AM – Morning dip at the beach\r\n9:00 AM – Breakfast at campsite\r\n10:00 AM – Check out and depart to Murudeshwar\r\n11:30 AM – Visit Murudeshwar Temple and giant Shiva statue\r\n12:30 PM – Lunch (self-sponsored)\r\n3:30 PM – Optional Honnavar backwater boat ride (not included in package)\r\n5:00 PM - Jog falls\r\n7:00 PM – Departure to Bangalore by bus\r\n\r\nDay : 3\r\nName : Arrival in Bangalore\r\n\r\nDetails :\r\n5:30 AM – Reach Bangalore', '2 Days', 1, 'Easy', NULL, 3500.00, 1799.00, 3500.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 07:31:38', '2026-10-09 07:32:11'),
(18, 'kodaikanal', 'Explore Kodaikanal – The Princess of Hill Stations ', 3, 'Rose Garden, Hill station, Pine Forest, Tea Estate, waterfalls', 'Kodaikanal, meaning the gift of the forest, is nestled in the Dindigul hills of Tamil Nadu. With its enchanting landscapes, misty mountains, serene lakes, and cool weather, Kodaikanal is one of the most beautiful and peaceful destinations in South India. This hill station is perfect for couples, families, solo travelers, and adventure seekers alike.\r\n\r\nFrom mysterious caves and valley views to scenic treks and peaceful boat rides, this trip is designed to offer a complete Kodaikanal experience in one weekend.', 'Day : 0\r\n\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\nPickup Points and Timings\r\n07:30 PM – Karachi Bakery, Indiranagar\r\n08:15 PM – Domlur, near Licious Head Office\r\n08:35 PM – Sony World Signal, Koramangala\r\n09:00 PM – Opposite Madiwala Police Station\r\nOvernight journey to Kodaikanal\r\n\r\nDay : 1\r\nName : Local Sightseeing and Lake Exploration\r\n\r\nDetails :\r\n06:00 AM – Quick freshen-up stop and breakfast during the journey\r\n10:00 AM – Reach Kodaikanal and check in to your hotel\r\n11:30 AM – Begin sightseeing\r\nPlaces Covered Before Lunch\r\nObservatory (Highest Point)\r\nRose Garden\r\nMoir Point\r\nPine Forest\r\nPillar Rocks\r\nSuicide Point or Green Valley View with optional shopping at the local bazaar\r\n02:00 PM – Lunch at a local restaurant (self-sponsored)\r\nPost-Lunch Attractions\r\nCoakers Walk with stunning views\r\nBryant Park\r\nBoating and shopping at Kodaikanal Lake\r\nExplore the mysterious Guna Caves\r\n06:30 PM – Return to hotel\r\n07:30 PM – Hi-tea and group activities\r\n08:30 PM – Buffet dinner with vegetarian and non-vegetarian options\r\n10:30 PM – Rest for the night\r\n\r\nDay : 2\r\nName : Trek and Waterfall Experience\r\n\r\nDetails :\r\n07:00 AM – Wake up and get ready\r\n08:00 AM – Enjoy breakfast with tea or coffee\r\n09:30 AM – Drive to Dolphin’s Nose starting point\r\n10:00 AM – Visit Vattakanal Falls for a refreshing water splash\r\n12:30 PM – Self-sponsored lunch at a local eatery\r\n01:30 PM – Dolphin’s Nose Trek with panoramic views of the valley\r\n04:30 PM – Return from the trek and begin journey back to Bangalore\r\n08:30 PM – Stop for self-sponsored dinner en route\r\n\r\nDay : 3\r\nName : Arrival in Bangalore\r\n\r\nDetails :\r\n05:00 AM – Reach Bangalore with fresh memories and new friendships', '2 Days', 2, 'Easy', NULL, 5499.00, 0.00, 5499.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 08:36:28', '2026-10-09 08:36:28'),
(19, 'chikmagalur', 'Chikmagalur Getaway – Coffee Trails and Cascades', 3, 'Hill station, Highest Peak, Falls, Coffee plantation, historical temple', 'Chikmagalur, often called the Coffee Land of Karnataka, is a charming hill station nestled in the foothills of the Western Ghats. Known for its lush green coffee estates, misty mountains, and tranquil waterfalls, Chikmagalur offers the perfect escape from the city rush.\r\n\r\nWith its cool climate, scenic beauty, and serene environment, this destination is a favorite for nature lovers, trekking enthusiasts, and anyone looking for a peaceful weekend getaway. The region is famous for producing some of the finest coffee in India, and the aroma of fresh coffee fills the air as you drive through its winding forest trails.\r\n\r\nFrom the highest peak of Karnataka – Mullayanagiri, to the peaceful surroundings of Baba Budangiri, and the adventure-filled trails to Hebbe Falls and Jhari Falls, Chikmagalur is full of natural wonders waiting to be explored.\r\n\r\nWhether you\'re sipping coffee by the plantation, trekking through the hills, or relaxing by a waterfall, Chikmagalur has something for everyone.', 'Day : 0\r\nName : Depart to Chikmagalur\r\n\r\nDetails :\r\n10:00 PM – Karach Bakery, Indiranagar\r\n10:15 PM – Domlur Skywalk\r\n10:50 PM – Yeshwanthpur Metro Station\r\n11:10 PM – Goraguntepalya, near People Tree Hospital\r\n\r\nDay : 1\r\nName : Waterfalls and Hill Views\r\n\r\nDetails :\r\nArrival at Chikmagalur and check-in to the homestay\r\nFreshen up and enjoy breakfast\r\nTravel to Kemmanagundi for sightseeing\r\nJeep ride to Hebbe Falls for a refreshing experience\r\nVisit to Veerabhadreshwara Shiva Temple at the base\r\nKallathigiri Falls  (Kalhatti Falls)\r\nReturn to the homestay and relax\r\nCampfire and games in the evening (weather permitting)\r\nDinner and overnight stay\r\n\r\nDay : 2\r\nName : Trekking and Scenic Spots\r\n\r\nDetails :\r\nBreakfast and check-out from the homestay\r\nHead to Mullayanagiri and Seethalayyanagiri for trekking and photography\r\nJeep ride to Jhari Falls with time to play in the water\r\nVisit Baba Budangiri  \r\nHonnammana Halla Falls\r\nVisit Belur if time permits\r\nLunch stop during return journey (self-sponsored)\r\nReach Bangalore by around 10:30 PM', '2 Days', 2, 'Easy', NULL, 4399.00, 0.00, 4399.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 08:44:19', '2026-10-09 08:44:19'),
(20, 'hampi', 'Explore Hampi Heritage', 3, 'Heritage, Vijayanagara, Ruins, Temples, Boulders, Karnataka, Architecture, History, UNESCO', 'Hampi is a famous UNESCO World Heritage Site located in the Vijayanagara district of Karnataka, India. Once the grand capital of the powerful Vijayanagara Empire in the 14th century, it was one of the largest and wealthiest cities in the world. The landscape is uniquely shaped by the flowing Tungabhadra River and surrounded by massive, balanced granite boulders and craggy hills.\r\nThe site features over 1,600 surviving ruins, ancient markets, and rock-cut shrines that show the high skill of South Indian architecture. Major landmarks include the towering Virupaksha Temple, the iconic Stone Chariot at the Vijaya Vittala Temple, the Lotus Mahal, and the Elephant Stables. After being destroyed in 1565, the ruins remain a major center for history, culture, and tourism today.', 'Day : 0\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\n10:00 PM: Indiranagar Karachi Bakery\r\n10:15 PM: Domlur\r\n10:45 PM: Yeshwanthpura\r\n11:00 PM: Goraguntepalya\r\nOvernight journey to Hampi\r\n\r\nDay : 1\r\nName : Heritage Exploration\r\n\r\nDetails :\r\n06:00 AM: Arrive at Hampi and transfer to stay\r\n06:00 AM: Freshen up and breakfast\r\n10:30 AM: Visit Vijaya Vittala Temple (Stone Chariot)\r\n11:00 AM: Explore Vijaya Vittala Temple complex\r\n12:30 PM: Lunch at a nearby restaurant (self-sponsored)\r\n01:30 PM: Visit Queens Bathhouse\r\n01:50 PM: Explore Mahanavami Dibba, Step Tank, Palace Ruins, Underground Chambers, and water systems\r\n02:55 PM: Visit Hazara Rama Temple\r\n03:20 PM: Explore Elephant Stables, Lotus Mahal, and Hampi Museum\r\n04:15 PM: Visit Lakshmi Narasimha Temple\r\n05:00 PM: Sunset at Hemakuta Hill\r\n06:30 PM: Visit Virupaksha Temple\r\n08:30 PM: Dinner and overnight stay at the hotel\r\n\r\nDay : 2\r\n\r\nDetails :\r\n08:00 AM: Breakfast\r\n9:00 AM Checkout\r\n10:00 AM: Drive to Anjanadri Betta\r\n11:00 AM: Climb Anjanadri Hill and explore\r\n12:30 PM: Lunch break (self-sponsored)\r\n02:00 PM: Visit Sanapur Lake\r\n03:00 PM: Coracle Ride and Cliff Jumping (self-sponsored)\r\n06:00 PM: Freshen up using common toilets\r\n10:00 PM: Depart for Bangalore, dinner on the way (self-sponsored)', '2 Days', 2, 'Easy', NULL, 3999.00, 0.00, 3999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 08:47:04', '2026-10-09 08:47:04'),
(21, 'huttari', 'Huttari betta Sunrise trek', 2, 'Sun rise, Trekking, hill fort', 'Huttaridurga, located just a few hours from Bangalore, is a hidden gem known for its ancient hill fort, panoramic sunrise views, and adventure-friendly terrain. This short but scenic trek is perfect for beginners, photographers, and nature enthusiasts alike.', 'Day : 0\r\nName : Departure from Bangalore\r\n\r\nDetails :\r\nPickup Points:\r\n10:30 PM – Marathahalli Bridge\r\n10:45 PM – Bellandur (Opp. Central Mall)\r\n11:00 PM – Silk Board\r\n11:10 PM – BTM Udupi Garden\r\n11:25 PM – Banashankari Bus Stand\r\n11:35 PM – Sarakki Signal\r\n11:45 PM – Devegowda Petrol Bunk\r\n11:55 PM – Katriguppe Signal\r\n12:15 AM – Nayandahalli Junction\r\n12:20 AM – Nagarbhavi Circle\r\n12:30 AM – Laggere Bridge\r\n12:40 AM – Kanteerava Studio (Opp. Rajkumar Punya Bhumi)\r\n12:55 AM – Jalahalli Cross\r\n01:00 AM – 8th Mile Signal\r\nExact location will be shared in the watsup group.\r\n\r\nDay : 1\r\nName : Bengaluru - Huttaribetta trek - Bengaluru\r\n\r\nDetails :\r\n04:00 AM – Reach base and freshen up\r\n04:15 AM – Start the trek\r\n05:15 AM – Reach peak, sunrise view, photo session & team activities\r\n07:10 AM – Begin descent\r\n08:00 AM – Reach base\r\n09:00 AM – Breakfast at a local restaurant (Self Sponsored)\r\n12:30 PM – Return to Bangalore', '1 Day', 1, 'Easy', '5 KM', 999.00, 299.00, 999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 08:59:53', '2026-10-09 09:04:10'),
(22, 'Shivgange', 'Shivgange Trek', 2, 'temple, Sunrise, rope climbing, adventure', 'Beginner‑friendly with stone steps for most of the route\r\n\r\nA mix of nature, history, and temples along the way\r\n\r\nCalm, devotional vibe—especially during early mornings\r\n\r\nPanoramic views of Tumakuru countryside at the top\r\n\r\nMostly well‑laid steps, with a few rocky stretches\r\n\r\nGradual ascent; mildly tiring near the summit\r\n\r\nSuitable for first‑timers and casual hikers\r\n\r\n\r\n\r\n', 'Day : 0\r\nName : Meet at the designated starting point in Bengaluru and travel to Shivagange\r\n\r\nDetails :\r\n▪️ 11:00 PM - Benniganahalli Metro Station, Tin Factory\r\n▪️ 11:20 PM - Kalamandir, Marathahalli\r\n▪️ 11:35 PM - Akme Harmony, Bellandur\r\n▪️ 11:50 PM - Silkboard Bus Stop, \r\n▪️ 12:00 AM - Udupi Garden Signal, BTM\r\n▪️ 12:15 AM - Banashankari Bus Stop\r\n▪️ 12:30 AM - Kathriguppe Circle\r\n▪️ 12:45 AM - Gopalan Arcade Mall RR Nagar\r\n▪️ 01:15 AM - Guraguntepalya Signal, Yeshwanthpur\r\n▪️ 01:30 AM - 8th Mile Circle, Dasarhalli\r\n\r\nDay : 1\r\nName : Bengaluru - Shivagange Trek - Bengaluru\r\n\r\nDetails :\r\n▪️ 03:00 AM - Arrive at the base of Shivagange base and take some time to relax\r\n▪️ 05:30 AM - Begin the ascent to the peak of Shivagange\r\nNOTE: Due to restrictions imposed by the forest officials, the trek will start at 05:30 AM\r\n▪️ 07:00 AM - Reach the summit of Shivagange and witness the sunrise during the trek\r\n▪️ 08:00 AM - Start the descent towards the base\r\n▪️ 09:30 AM - Take a break en route to enjoy a self-funded breakfast.\r\n▪️ 12:30 PM - Arrive back in Bangalore, marking the end of this exciting adventure\r\n▪️ Drop-off Points: The drop-off points will be the same as the pick-up points to ensure convenience for all travellers. Please ensure you have all your belongings before leaving the vehicle.', '1 Day', 1, 'Easy', '5 KM', 999.00, 199.00, 999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 09:09:35', '2026-10-09 09:09:35'),
(23, 'madhugiri', 'Madhugiri Trek', 2, 'rock climbing, panoramic views, fort, rock steps', 'The Madhugiri trek is a thrilling and adventurous climb, famous for being the second‑largest monolith in Asia. It’s more challenging than most beginner treks near Bengaluru.\r\n\r\nAdventure‑heavy and physically demanding\r\n\r\nA mix of history, rock climbing feel, and panoramic views\r\nHighly rewarding for those who enjoy steep climbs\r\n\r\nStrong sense of achievement at the summit\r\n\r\nSteep ascent with rock‑cut steps and exposed sections\r\n\r\nRequires good balance and stamina\r\n\r\nSome sections are narrow with railings for support\r\n\r\nNot suitable for casual walkers', 'Day : 0\r\nName : Meet at the designated starting point in Bengaluru and travel to Tumkur by private transportation\r\n\r\nDetails :\r\n▪️ 11:00 PM - Benniganahalli Metro Station, Tin Factory\r\n▪️ 11:20 PM - Kalamandir, Marathahalli\r\n▪️ 11:35 PM - Akme Harmony, Bellandur\r\n▪️ 11:50 PM - Silkboard Bus Stop, \r\n▪️ 12:00 AM - Udupi Garden Signal, BTM\r\n▪️ 12:15 AM - Banashankari Bus Stop\r\n▪️ 12:30 AM - Kathriguppe Circle\r\n▪️ 12:45 AM - Gopalan Arcade Mall RR Nagar\r\n▪️ 01:15 AM - Guraguntepalya Signal, Yeshwanthpur\r\n▪️ 01:30 AM - 8th Mile Circle, Dasarhalli\r\n\r\nDay : 1\r\nName : Ascending & descending the trail\r\n\r\nDetails :\r\n▪️ 04:30 AM - Arrive at the base of Madhugiri Betta and take some time to relax\r\n▪️ 05:45 AM - Begin the ascent to the peak of Madhugiri Betta\r\n▪️ 08:00 AM - Reach the summit of Madhugiri Betta and witness the scenic beauty\r\n▪️ 09:30 AM - Start the descent towards the base\r\n▪️ 10:00 AM - Take a break en route to freshen up and enjoy a self-funded breakfast.\r\n▪️ 12:30 PM - Arrive back in Bangalore, marking the end of this exciting adventure\r\n▪️ Drop-off Points: The drop-off points will be the same as the pick-up points to ensure convenience for all travelers. Please ensure you have all your belongings before leaving the vehicle.', '1 Day', 1, 'Easy', '4 KM', 999.00, 299.00, 999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 09:09:35', '2026-10-09 09:09:35'),
(24, 'channarayanadurga', 'Channarayana Durga Trek', 2, 'offbeat, rocky paths, forest sections, and uneven terrain', 'The Channarayana Durga trek is a quiet, offbeat, and history‑rich hike—perfect for trekkers\r\n\r\nPeaceful and less explored compared to popular treks\r\n\r\nStrong historical vibe with fort ruins at the top\r\n\r\nGreat sense of solitude and connection with nature\r\n\r\nIdeal for a half‑day adventure\r\n\r\nMix of rocky paths, forest sections, and uneven terrain\r\n\r\nModerate ascent; a few steep stretches near the summit\r\n\r\nTrail is not well marked in some sections—best with a group\r\n\r\nNo technical climbing, but requires good balance', 'Day : 0\r\nName : Departure from Bengaluru\r\n\r\nDetails :\r\nMeet at the designated starting point in Bengaluru and travel to Madhugiri by private transportation\r\n▪️ 11:00 PM - Benniganahalli Metro Station, Tin Factory\r\n▪️ 11:20 PM - Kalamandir, Marathahalli\r\n▪️ 11:35 PM - Akme Harmony, Bellandur\r\n▪️ 11:50 PM - Silkboard Bus Stop, \r\n▪️ 12:00 AM - Udupi Garden Signal, BTM\r\n▪️ 12:15 AM - Banashankari Bus Stop\r\n▪️ 12:30 AM - Kathriguppe Circle\r\n▪️ 12:45 AM - Gopalan Arcade Mall RR Nagar\r\n▪️ 01:15 AM - Guraguntepalya Signal, Yeshwanthpur\r\n▪️ 01:30 AM - 8th Mile Circle, Dasarhalli\r\n\r\nDay : 1\r\nName : Bengaluru - Channarayanadurga trek - Bengaluru\r\n\r\nDetails :\r\n▪️ 02:30 AM - Arrive at the base of Channarayana Durga and take some time to relax\r\n▪️ 04:00 AM - Begin the ascent to the peak of Channarayana Durga\r\n▪️ 05:00 AM - Reach the summit of Channarayana Durga and witness the sunrise\r\n▪️ 07:00 AM - Post-sunrise, start the descent towards the base\r\n▪️ 07:30 AM - Take a break en route to freshen up and enjoy a self-funded breakfast.\r\n▪️ 12:30 PM - Arrive back in Bangalore, marking the end of this exciting adventure\r\n▪️ Drop-off Points: The drop-off points will be the same as the pick-up points to ensure convenience for all travellers. Please ensure you have all your belongings before leaving the vehicle.\r\n\r\nPlease note that this itinerary may vary depending on weather conditions and other factors. Also, the timings mentioned here are only indicative and may change based on the group`s pace.', '1 Day', 1, 'Easy', '4 KM', 999.00, 299.00, 999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 09:14:40', '2026-10-09 09:14:40'),
(25, 'nandihills', 'Nandi Hills & Adiyogi ', 2, 'sunrise, cloud bed, shiva statue, lightshow, divine enegry ', 'Escape the city for a refreshing 1-day outing that combines the cool hilltop views of Nandi Hills with the peaceful spiritual ambience of Sadhguru Sannidhi (Isha Foundation) near Bengaluru. Enjoy scenic drives, relaxed sightseeing, and an immersive Adiyogi light show in the evening, making it a perfect short break for friends, families, and solo travelers alike.​​\r\n\r\nThis trip is hosted by FITNESS GONE WILD (FGW), with end-to-end coordination, comfortable transport, and a friendly team to ensure you have a smooth and memorable experience.', 'Day : 1\r\nName : Bengaluru – Nandi Hills – Isha Foundation – Bengaluru\r\n\r\nDetails :\r\n09:00 AM: Start pickups and depart from Bengaluru towards Nandi Hills.\r\n12:30 PM: Reach Nandi Hills, start ascending the trek\r\n02:00 PM: Reach hill top\r\n02–04:30 PM: Have self-sponsored lunch, proceed for sightseeing and leisure time at the hilltop\r\n04:30 PM: Start descending the trek\r\n05:30 PM: Depart from Nandi Hills and drive towards Sadhguru Sannidhi (Isha Foundation), Chikkaballapur.\r\n06:30 PM: Reach Isha Foundation, explore the Adiyogi premises and soak in the evening spiritual ambience.\r\n07:30–08:00 PM: Experience the Adiyogi light show / evening program (subject to daily schedule and availability).\r\n08:30 PM: Depart from Isha Foundation and start return journey to Bengaluru.\r\n10:30 PM: Reach back Bengaluru and trip ends.', '1 Day', 1, 'Easy', NULL, 999.00, 299.00, 999.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'published', '2026-10-09 09:14:40', '2026-10-09 09:14:40'),
(28, 'tadiandamol-trek-the-highest-peak-of-coorg', 'Tadiandamol Trek – The Highest Peak of Coorg', 1, 'Rolling meadows, Dense shola forests, Water Streams, open grass land, 360 degree view', 'Tadiandamol Trek – Conquer the Highest Peak of Coorg\nLocated in the scenic Western Ghats of Karnataka, Tadiandamol is the highest peak in Coorg and the third highest in Karnataka, standing tall at an altitude of 1,748 meters. This trek is a perfect blend of rolling meadows, dense shola forests, vibrant flora, and panoramic mountain views that stretch endlessly across the Kodagu landscape.\n\nWhether you\'re a first-time trekker or a seasoned adventurer, the Tadiandamol trail offers a moderate yet rewarding experience. The journey begins through lush greenery and coffee estates, gradually ascending into mist-covered trails and open grasslands that feel untouched by time. The summit offers a breathtaking 360-degree view of the Western Ghats—a moment of pure awe and serenity.\n\nIdeal for a weekend escape, the Tadiandamol Trek is an excellent opportunity to unplug from the chaos, breathe in crisp mountain air, and reconnect with nature.', 'Day : 0\nName : Pickup Points and Timings:\n\nDetails :\n10:00 PM – Karachi Bakery, Indiranagar\n10:15 PM – Domlur Skywalk, Domlur\n10:50 PM – Yeshwantpur Metro Station (towards Tumkur side)\n11:00 PM – People Tree Hospitals, Goraguntepalya\n\n\nDay : 1\nName : Tadiandamol Trek\n\nDetails :\n05:30 AM – Reach base camp and freshen up\n07:00 AM – Enjoy a hearty breakfast\n08:30 AM – Begin the trek to Tadiandamol Peak\n01:00 PM – Reach the summit and have a packed lunch\n02:30 PM – Begin descent back to the base\n05:30 PM – Reach campsite and refresh\n06:00 PM – Tea or coffee with snacks\n08:00 PM – Bonfire (weather permitting) followed by dinner\n10:00 PM – Rest in comfortable tents\n\nDay : 3\nName : Return Journey, Visit to Elephant Camp Dubare and Golden temple\n\nDetails :\n07:30 AM – Wake up and freshen up\n08:00 AM – Breakfast at the campsite and return Journey to Bangalore\n08:40 AM – Optional visit to Dubare Elephant Camp (entry not included)\n11:00 AM – Visit Namdroling Monastery Golden Temple\n01:00 PM – Stop for self-sponsored lunch\n05:00 PM - Visit Payana Museum (entry not included)\n10:00 PM – Arrival in Bangalore', '2 Days', 2, 'Easy', NULL, 3499.00, 1999.00, 3499.00, NULL, NULL, NULL, 'plain', 0, NULL, NULL, 'draft', '2026-10-12 16:40:00', '2026-10-12 16:56:16');

-- --------------------------------------------------------

--
-- Table structure for table `trip_images`
--

DROP TABLE IF EXISTS `trip_images`;
CREATE TABLE IF NOT EXISTS `trip_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `caption` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_images_trip` (`trip_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trip_interests`
--

DROP TABLE IF EXISTS `trip_interests`;
CREATE TABLE IF NOT EXISTS `trip_interests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_id` int NOT NULL,
  `type` enum('interested','enquiry') COLLATE utf8mb4_general_ci NOT NULL,
  `source` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'website',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trip_interests`
--

INSERT INTO `trip_interests` (`id`, `trip_id`, `type`, `source`, `created_at`) VALUES
(1, 1, 'interested', 'website', '2026-09-01 23:59:32'),
(2, 2, 'interested', 'website', '2026-09-01 23:59:48'),
(3, 7, 'interested', 'website', '2026-09-01 23:59:54'),
(4, 1, 'enquiry', 'website', '2026-09-02 00:00:00'),
(5, 1, 'interested', 'website', '2026-09-02 01:18:24'),
(6, 1, 'interested', 'website', '2026-09-02 09:24:42'),
(7, 1, 'enquiry', 'website', '2026-09-02 09:24:46'),
(8, 1, 'interested', 'website', '2026-09-02 09:24:51'),
(9, 1, 'interested', 'website', '2026-09-02 07:14:14'),
(10, 1, 'interested', 'website', '2026-09-02 14:56:55'),
(11, 1, 'interested', 'website', '2026-09-02 14:56:57'),
(12, 1, 'interested', 'website', '2026-09-02 14:56:59'),
(13, 1, 'interested', 'website', '2026-09-02 14:57:00'),
(14, 6, 'enquiry', 'website', '2026-10-09 11:34:43'),
(15, 6, 'interested', 'website', '2026-10-09 11:34:46'),
(16, 6, 'interested', 'website', '2026-10-09 15:25:48'),
(17, 6, 'interested', 'website', '2026-10-12 15:09:10'),
(18, 6, 'interested', 'website', '2026-10-12 15:14:16'),
(19, 6, 'interested', 'website', '2026-10-12 15:18:14'),
(20, 6, 'enquiry', 'website', '2026-10-12 15:18:42'),
(21, 6, 'interested', 'website', '2026-10-12 15:40:09'),
(22, 6, 'interested', 'website', '2026-10-12 15:40:20');

-- --------------------------------------------------------

--
-- Table structure for table `why_us`
--

DROP TABLE IF EXISTS `why_us`;
CREATE TABLE IF NOT EXISTS `why_us` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `why_us`
--

INSERT INTO `why_us` (`id`, `title`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Leaders, not tour guides 3', 'Every trip is led by someone with wilderness first-aid certification who has walked that trail at least ten times.', '2026-09-01 17:59:45', '2026-09-01 18:02:40'),
(2, 'Groups capped at 25', 'Small enough that nobody gets left at the back, and quiet enough that you still hear the forest.', '2026-09-01 17:59:45', '2026-09-01 17:59:45'),
(3, 'Transport from your side of town', 'Five pickup points across Bangalore. No 4 AM cab to a mystery meeting spot.', '2026-09-01 17:59:45', '2026-09-01 17:59:45'),
(4, 'Safety kit on every trip', 'First-aid kit, pulse oximeter, emergency oxygen on high treks, and a backup vehicle on call.', '2026-09-01 17:59:45', '2026-09-01 17:59:45'),
(5, 'One price, printed upfront', 'Permits, meals and stay are in the number you see. Full refund if you cancel 7 days out.', '2026-09-01 17:59:45', '2026-09-01 17:59:45'),
(6, 'We carry our waste back', 'Leave-no-trace briefing before every trek, and a bag of collected litter comes down with us.', '2026-09-01 17:59:45', '2026-09-01 17:59:45');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `fk_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
