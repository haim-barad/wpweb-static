<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Shoeinv_Activator {

	public static function activate() {
		self::create_tables();
		self::maybe_migrate_columns();

		if ( ! get_option( 'shoeinv_db_version' ) ) {
			add_option( 'shoeinv_db_version', SHOEINV_VERSION );
		}
	}

	/**
	 * Rename legacy `session_id` columns to `event_id` if upgrading from the
	 * shoe-inventory (WPForms) plugin. dbDelta() cannot rename columns.
	 */
	private static function maybe_migrate_columns() {
		global $wpdb;

		// shoeinv_stock: rename session_id → event_id if needed
		$stock_cols = $wpdb->get_col( "SHOW COLUMNS FROM `{$wpdb->prefix}shoeinv_stock` LIKE 'session_id'" );
		if ( ! empty( $stock_cols ) ) {
			$wpdb->query( "ALTER TABLE `{$wpdb->prefix}shoeinv_stock` CHANGE `session_id` `event_id` BIGINT UNSIGNED NOT NULL" );
		}

		// shoeinv_reservations: rename session_id → event_id if needed
		$res_cols = $wpdb->get_col( "SHOW COLUMNS FROM `{$wpdb->prefix}shoeinv_reservations` LIKE 'session_id'" );
		if ( ! empty( $res_cols ) ) {
			$wpdb->query( "ALTER TABLE `{$wpdb->prefix}shoeinv_reservations` CHANGE `session_id` `event_id` BIGINT UNSIGNED NOT NULL" );
		}
	}

	public static function deactivate() {
		// Reserved for future use.
	}

	private static function create_tables() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();

		$sql_stock = "CREATE TABLE {$wpdb->prefix}shoeinv_stock (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL COMMENT 'event_id references tribe_events post ID',
  shoe_size VARCHAR(16) NOT NULL,
  total_stock INT UNSIGNED NOT NULL DEFAULT 0,
  reserved_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY uniq_event_size (event_id, shoe_size),
  KEY idx_event (event_id)
) $charset_collate;";

		$sql_reservations = "CREATE TABLE {$wpdb->prefix}shoeinv_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entry_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  shoe_size VARCHAR(16) NOT NULL,
  status ENUM('confirmed','rolled_back') NOT NULL DEFAULT 'confirmed',
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY idx_entry (entry_id),
  KEY idx_event (event_id)
) $charset_collate;";

		$sql_audit = "CREATE TABLE {$wpdb->prefix}shoeinv_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action VARCHAR(64) NOT NULL,
  session_id BIGINT UNSIGNED NULL,
  shoe_size VARCHAR(16) NULL,
  entry_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY idx_created (created_at)
) $charset_collate;";

		dbDelta( $sql_stock );
		dbDelta( $sql_reservations );
		dbDelta( $sql_audit );
	}
}
