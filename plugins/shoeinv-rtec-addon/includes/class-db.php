<?php
/**
 * Database abstraction layer for Shoe Inventory RTEC Add-on.
 *
 * @package ShoeinvRtecAddon
 * @subpackage DB
 * @text-domain shoeinv-rtec-addon
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Shoeinv_DB
 *
 * All database access for the Shoe Inventory RTEC Add-on plugin.
 * All methods are static. All queries use $wpdb->prepare().
 */
class Shoeinv_DB {

	// -------------------------------------------------------------------------
	// Table name helpers
	// -------------------------------------------------------------------------

	/**
	 * @return string
	 */
	private static function stock_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'shoeinv_stock';
	}

	/**
	 * @return string
	 */
	private static function reservations_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'shoeinv_reservations';
	}

	/**
	 * @return string
	 */
	private static function audit_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'shoeinv_audit';
	}

	// -------------------------------------------------------------------------
	// Settings
	// -------------------------------------------------------------------------

	/**
	 * Returns plugin settings merged with defaults.
	 *
	 * @return array
	 */
	public static function get_settings(): array {
		$defaults = [
			'size_list'      => [ '35-37', '38-40', '41-43', 'BYOS' ],
			'max_class_size' => 10,
		];

		$saved = get_option( 'shoeinv_settings', [] );

		return array_merge( $defaults, (array) $saved );
	}

	/**
	 * Sanitizes and persists plugin settings.
	 *
	 * @param array $settings Raw settings array.
	 * @return bool True on success, false on failure.
	 */
	public static function save_settings( array $settings ): bool {
		$clean = [];

		$clean['max_class_size'] = absint( $settings['max_class_size'] ?? 10 );

		$size_list = $settings['size_list'] ?? [];
		if ( is_array( $size_list ) ) {
			$clean['size_list'] = array_map( 'sanitize_text_field', $size_list );
		} else {
			$clean['size_list'] = [ '35-37', '38-40', '41-43', 'BYOS' ];
		}

		return update_option( 'shoeinv_settings', $clean );
	}

	// -------------------------------------------------------------------------
	// Stock
	// -------------------------------------------------------------------------

	/**
	 * Returns stock rows for a given tribe_events post ID.
	 *
	 * @param int $event_id  tribe_events post ID
	 * @return array  Objects with shoe_size, total_stock, reserved_count
	 */
	public static function get_stock_for_event( int $event_id ): array {
		global $wpdb;
		$table = self::stock_table();
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT shoe_size, total_stock, reserved_count
				 FROM `{$table}`
				 WHERE event_id = %d
				 ORDER BY shoe_size",
				$event_id
			)
		) ?: [];
	}

	/**
	 * Upsert stock for a size on an event.
	 *
	 * @param int    $event_id
	 * @param string $shoe_size
	 * @param int    $total_stock
	 */
	public static function set_stock( int $event_id, string $shoe_size, int $total_stock ): void {
		global $wpdb;
		$table = self::stock_table();
		$wpdb->query( $wpdb->prepare(
			"INSERT INTO `{$table}` (event_id, shoe_size, total_stock, reserved_count, updated_at)
			 VALUES (%d, %s, %d, 0, NOW())
			 ON DUPLICATE KEY UPDATE total_stock = %d, updated_at = NOW()",
			$event_id, $shoe_size, $total_stock, $total_stock
		) );
	}

	// -------------------------------------------------------------------------
	// Atomic Reservation
	// -------------------------------------------------------------------------

	/**
	 * Atomically increments reserved_count only when stock is available.
	 *
	 * The UPDATE only affects the row when reserved_count < total_stock,
	 * ensuring no over-reservation without application-level locking.
	 *
	 * @param int    $event_id  tribe_events post ID.
	 * @param string $shoe_size Shoe size label.
	 * @return bool True if exactly one row was updated (reservation succeeded).
	 */
	public static function atomic_reserve( int $event_id, string $shoe_size ): bool {
		global $wpdb;

		$table = self::stock_table();

		$sql = $wpdb->prepare(
			"UPDATE `{$table}`
			 SET reserved_count = reserved_count + 1, updated_at = NOW()
			 WHERE event_id = %d
			   AND shoe_size = %s
			   AND reserved_count < total_stock",
			$event_id,
			$shoe_size
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $sql );

		return 1 === $wpdb->rows_affected;
	}

	/**
	 * Rolls back a previously claimed reservation slot (floor: 0).
	 *
	 * @param int    $event_id  tribe_events post ID.
	 * @param string $shoe_size Shoe size label.
	 * @return void
	 */
	public static function rollback_reserve( int $event_id, string $shoe_size ): void {
		global $wpdb;

		$table = self::stock_table();

		$sql = $wpdb->prepare(
			"UPDATE `{$table}`
			 SET reserved_count = GREATEST(0, reserved_count - 1), updated_at = NOW()
			 WHERE event_id = %d AND shoe_size = %s",
			$event_id,
			$shoe_size
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $sql );

		self::log_audit( 'rollback_reserve', $event_id, $shoe_size );
	}

	/**
	 * Inserts a confirmed reservation record into the reservations table.
	 *
	 * @param int    $entry_id  WPForms / form entry ID.
	 * @param int    $event_id  tribe_events post ID.
	 * @param string $shoe_size Shoe size label.
	 * @return bool True on success, false on failure.
	 */
	public static function confirm_reservation( int $entry_id, int $event_id, string $shoe_size ): bool {
		global $wpdb;

		$result = $wpdb->insert(
			self::reservations_table(),
			[
				'entry_id'   => $entry_id,
				'event_id'   => $event_id,
				'shoe_size'  => $shoe_size,
				'status'     => 'confirmed',
				'created_at' => current_time( 'mysql' ),
			],
			[ '%d', '%d', '%s', '%s', '%s' ]
		);

		if ( false === $result ) {
			return false;
		}

		self::log_audit( 'confirm_reservation', $event_id, $shoe_size, $entry_id );

		return true;
	}

	// -------------------------------------------------------------------------
	// Deletion Rollback
	// -------------------------------------------------------------------------

	/**
	 * Rolls back all confirmed reservations for a given form entry.
	 *
	 * Marks reservations as 'rolled_back' and decrements reserved_count for each.
	 *
	 * @param int $entry_id Form entry ID.
	 * @return bool True if at least one reservation was rolled back, false otherwise.
	 */
	public static function delete_reservation_by_entry( int $entry_id ): bool {
		global $wpdb;

		$res_table = self::reservations_table();

		// 1. Find all confirmed reservations for this entry.
		$reservations = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM `{$res_table}` WHERE entry_id = %d AND status = %s",
				$entry_id,
				'confirmed'
			)
		);

		if ( empty( $reservations ) ) {
			return false;
		}

		// 2. Mark as rolled_back and release each slot.
		foreach ( $reservations as $reservation ) {
			$wpdb->update(
				$res_table,
				[ 'status' => 'rolled_back' ],
				[ 'id'     => (int) $reservation->id ],
				[ '%s' ],
				[ '%d' ]
			);

			self::rollback_reserve( (int) $reservation->event_id, $reservation->shoe_size );
		}

		// 3. Log audit.
		self::log_audit(
			'delete_reservation',
			0,
			'',
			$entry_id,
			sprintf( 'Rolled back %d reservation(s)', count( $reservations ) )
		);

		return true;
	}

	// -------------------------------------------------------------------------
	// Audit Log
	// -------------------------------------------------------------------------

	/**
	 * Inserts a row into the audit log table.
	 *
	 * @param string $action    Action label (e.g. 'atomic_reserve').
	 * @param int    $event_id  tribe_events post ID (stored as NULL if 0).
	 * @param string $shoe_size Shoe size label (stored as NULL if empty).
	 * @param int    $entry_id  Form entry ID (stored as NULL if 0).
	 * @param string $notes     Free-text notes.
	 * @return void
	 */
	public static function log_audit(
		string $action,
		int $event_id = 0,
		string $shoe_size = '',
		int $entry_id = 0,
		string $notes = ''
	): void {
		global $wpdb;

		$table = self::audit_table();

		$data    = [
			'action'     => sanitize_text_field( $action ),
			'session_id' => $event_id > 0 ? $event_id : null,
			'shoe_size'  => '' !== $shoe_size ? sanitize_text_field( $shoe_size ) : null,
			'entry_id'   => $entry_id > 0 ? $entry_id : null,
			'user_id'    => get_current_user_id(),
			'notes'      => sanitize_textarea_field( $notes ),
			'created_at' => current_time( 'mysql' ),
		];

		$formats = [ '%s', '%d', '%s', '%d', '%d', '%s', '%s' ];

		$wpdb->insert( $table, $data, $formats );
	}
}
