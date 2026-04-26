<?php
/**
 * Admin class for Shoe Inventory RTEC Add-on.
 *
 * Handles the tribe_events meta box, stock editing per event,
 * and plugin settings (size list, max class size).
 *
 * @package Shoeinv
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Shoeinv_Admin
 *
 * Registers the tribe_events meta box, settings sub-menu page,
 * and all related save/enqueue hooks.
 */
class Shoeinv_Admin {

	/**
	 * Constructor — registers all admin hooks.
	 */
	public function __construct() {
		add_action( 'add_meta_boxes',              [ $this, 'register_meta_box' ] );
		add_action( 'save_post_tribe_events',      [ $this, 'save_meta_box' ], 10, 1 );
		add_action( 'admin_enqueue_scripts',       [ $this, 'enqueue_assets' ] );
		add_action( 'admin_menu',                  [ $this, 'register_settings_page' ] );
		add_action( 'admin_post_shoeinv_save_settings', [ $this, 'handle_save_settings' ] );
		add_action( 'admin_post_shoeinv_remove_registrant', [ $this, 'handle_remove_registrant' ] );

		// Clean up reservations when a tribe_events post is permanently deleted.
		add_action( 'delete_post',                 [ $this, 'handle_event_deletion' ] );
	}

	// -------------------------------------------------------------------------
	// Meta Box
	// -------------------------------------------------------------------------

	/**
	 * Register the shoe-inventory meta box on tribe_events edit screens.
	 */
	public function register_meta_box() {
		add_meta_box(
			'shoeinv_event_meta',
			__( 'מלאי נעליים', 'shoeinv' ),
			[ $this, 'render_meta_box' ],
			'tribe_events',
			'side',
			'default'
		);
	}

	/**
	 * Render the shoe-inventory meta box.
	 *
	 * @param WP_Post $post Current post object.
	 */
	public function render_meta_box( $post ) {
		wp_nonce_field( 'shoeinv_meta_box', 'shoeinv_nonce' );

		$enabled = get_post_meta( $post->ID, '_shoeinv_enabled', true );

		$checked = ( '1' === $enabled ) ? ' checked="checked"' : '';
		?>
		<p>
			<label>
				<input type="checkbox"
					id="shoeinv-enabled-cb"
					name="shoeinv_enabled"
					value="1"<?php echo $checked; ?> />
				<?php esc_html_e( 'הפעל מלאי נעליים לאירוע זה', 'shoeinv' ); ?>
			</label>
		</p>

		<div class="shoeinv-stock-fields">
			<?php
			$settings   = Shoeinv_DB::get_settings();
			$size_list  = isset( $settings['size_list'] ) ? (array) $settings['size_list'] : [];
			$stock_rows = Shoeinv_DB::get_stock_for_event( $post->ID );

			// Index stock rows by shoe_size for fast lookup.
			$stock_by_size = [];
			if ( is_array( $stock_rows ) ) {
				foreach ( $stock_rows as $row ) {
					$stock_by_size[ $row->shoe_size ] = $row;
				}
			}

			foreach ( $size_list as $size ) {
				if ( 'BYOS' === $size ) {
					continue;
				}

				$row            = isset( $stock_by_size[ $size ] ) ? $stock_by_size[ $size ] : null;
				$total_stock    = $row ? (int) $row->total_stock    : 0;
				$reserved_count = $row ? (int) $row->reserved_count : 0;

				$size_attr = esc_attr( $size );
				?>
				<label>
					<?php echo esc_html( $size ); ?>:
					<input type="number"
						name="shoeinv_stock[<?php echo $size_attr; ?>]"
						value="<?php echo esc_attr( $total_stock ); ?>"
						min="0"
						max="99" />
				</label>
				<?php if ( $reserved_count > 0 ) : ?>
					<span class="shoeinv-reserved">
						<?php
						/* translators: %d: number of reserved spots */
						printf( esc_html__( '(שמורות: %d)', 'shoeinv' ), $reserved_count );
						?>
					</span>
				<?php endif; ?>
				<?php
			}
			?>
		</div>
		<?php
	}

	/**
	 * Save shoe-inventory meta box data.
	 *
	 * @param int $post_id Post ID.
	 */
	public function save_meta_box( $post_id ) {
		if ( ! isset( $_POST['shoeinv_nonce'] ) ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_key( $_POST['shoeinv_nonce'] ), 'shoeinv_meta_box' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$enabled = isset( $_POST['shoeinv_enabled'] ) ? '1' : '0';
		update_post_meta( $post_id, '_shoeinv_enabled', $enabled );

		$settings    = Shoeinv_DB::get_settings();
		$size_list   = isset( $settings['size_list'] ) ? (array) $settings['size_list'] : [];
		$stock_input = isset( $_POST['shoeinv_stock'] ) ? (array) $_POST['shoeinv_stock'] : [];

		foreach ( $size_list as $size ) {
			if ( 'BYOS' === $size ) {
				continue;
			}
			$qty = isset( $stock_input[ $size ] ) ? absint( $stock_input[ $size ] ) : 0;
			Shoeinv_DB::set_stock( $post_id, $size, $qty );
		}
	}

	// -------------------------------------------------------------------------
	// Settings Page
	// -------------------------------------------------------------------------

	/**
	 * Register a sub-menu page under the Events (tribe_events) post type.
	 */
	public function register_settings_page() {
		add_submenu_page(
			'edit.php?post_type=tribe_events',
			__( 'מלאי נעליים – הרשמות', 'shoeinv' ),
			__( 'מלאי נעליים', 'shoeinv' ),
			'manage_options',
			'shoeinv-registrations',
			[ $this, 'render_registrations_page' ]
		);
		add_submenu_page(
			'edit.php?post_type=tribe_events',
			__( 'מלאי נעליים – הגדרות', 'shoeinv' ),
			__( 'הגדרות מלאי נעליים', 'shoeinv' ),
			'manage_options',
			'shoeinv-settings',
			[ $this, 'render_settings_page' ]
		);
	}

	/**
	 * Render the registrations list page — who signed up for which shoe size.
	 */
	public function render_registrations_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'אין לך הרשאה לצפות בדף זה.', 'shoeinv' ) );
		}

		global $wpdb;

		// Get all events that have inventory enabled.
		$event_ids = $wpdb->get_col(
			"SELECT DISTINCT pm.post_id
			 FROM {$wpdb->postmeta} pm
			 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			 WHERE pm.meta_key = '_shoeinv_enabled' AND pm.meta_value = '1'
			   AND p.post_status != 'trash'
			 ORDER BY pm.post_id DESC"
		);

		// Optional: filter by event from query string.
		$selected_event = isset( $_GET['shoeinv_event'] ) ? absint( $_GET['shoeinv_event'] ) : 0;
		if ( ! $selected_event && ! empty( $event_ids ) ) {
			$selected_event = (int) $event_ids[0];
		}

		?>

	/**
	 * Render the registrations list page — who signed up for which shoe size.
	 */
	public function render_registrations_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'אין לך הרשאה לצפות בדף זה.', 'shoeinv' ) );
		}

		global $wpdb;

		// Get all events that have inventory enabled.
		$event_ids = $wpdb->get_col(
			"SELECT DISTINCT pm.post_id
			 FROM {$wpdb->postmeta} pm
			 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			 WHERE pm.meta_key = '_shoeinv_enabled' AND pm.meta_value = '1'
			   AND p.post_status != 'trash'
			 ORDER BY pm.post_id DESC"
		);

		// Optional: filter by event from query string.
		$selected_event = isset( $_GET['shoeinv_event'] ) ? absint( $_GET['shoeinv_event'] ) : 0;
		if ( ! $selected_event && ! empty( $event_ids ) ) {
			$selected_event = (int) $event_ids[0];
		}

		?>
		<div class="wrap" dir="rtl">
			<h1><?php esc_html_e( 'מלאי נעליים – הרשמות', 'shoeinv' ); ?></h1>

			<?php if ( empty( $event_ids ) ) : ?>
				<p><?php esc_html_e( 'אין אירועים עם מלאי נעליים פעיל.', 'shoeinv' ); ?></p>
			<?php else : ?>

			<form method="get">
				<input type="hidden" name="post_type" value="tribe_events" />
				<input type="hidden" name="page" value="shoeinv-registrations" />
				<select name="shoeinv_event" onchange="this.form.submit()">
					<?php foreach ( $event_ids as $eid ) : ?>
						<option value="<?php echo esc_attr( $eid ); ?>" <?php selected( $selected_event, (int) $eid ); ?>>
							<?php echo esc_html( get_the_title( $eid ) ); ?> (ID <?php echo esc_html( $eid ); ?>)
						</option>
					<?php endforeach; ?>
				</select>
				<?php submit_button( __( 'הצג', 'shoeinv' ), 'secondary', '', false ); ?>
			</form>

			<?php if ( $selected_event ) :
				// Stock summary for selected event.
				$stock_rows = Shoeinv_DB::get_stock_for_event( $selected_event );
				// Registrations for selected event (join reservations + rtec_registrations).
				$registrations = $wpdb->get_results( $wpdb->prepare(
					"SELECT r.id AS res_id, r.entry_id, r.shoe_size, r.status, r.created_at,
					        reg.first_name, reg.last_name, reg.email
					 FROM `{$wpdb->prefix}shoeinv_reservations` r
					 LEFT JOIN `{$wpdb->prefix}rtec_registrations` reg ON reg.id = r.entry_id
					 WHERE r.event_id = %d
					 ORDER BY r.created_at DESC",
					$selected_event
				) );
			?>

			<h2><?php echo esc_html( get_the_title( $selected_event ) ); ?></h2>

			<?php if ( ! empty( $stock_rows ) ) : ?>
			<h3><?php esc_html_e( 'סיכום מלאי', 'shoeinv' ); ?></h3>
			<table class="widefat striped" style="max-width:400px;margin-bottom:20px">
				<thead><tr>
					<th><?php esc_html_e( 'מידה', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'מלאי', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'שמורות', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'פנויות', 'shoeinv' ); ?></th>
				</tr></thead>
				<tbody>
				<?php foreach ( $stock_rows as $sr ) : $free = max( 0, (int) $sr->total_stock - (int) $sr->reserved_count ); ?>
					<tr>
						<td><?php echo esc_html( $sr->shoe_size ); ?></td>
						<td><?php echo esc_html( $sr->total_stock ); ?></td>
						<td><?php echo esc_html( $sr->reserved_count ); ?></td>
						<td style="color:<?php echo $free > 0 ? 'green' : 'red'; ?>"><?php echo esc_html( $free ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<?php endif; ?>

			<h3><?php esc_html_e( 'רשימת נרשמות', 'shoeinv' ); ?></h3>
			<?php if ( ! empty( $registrations ) ) : ?>
			<table class="widefat striped">
				<thead><tr>
					<th><?php esc_html_e( 'שם', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'אימייל', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'מידת נעל', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'סטטוס', 'shoeinv' ); ?></th>
					<th><?php esc_html_e( 'תאריך הרשמה', 'shoeinv' ); ?></th>
					<th></th>
				</tr></thead>
				<tbody>
				<?php foreach ( $registrations as $reg ) :
					$shoe = ( 'BYOS' === $reg->shoe_size ) ? __( 'ללא נעליים', 'shoeinv' ) : esc_html( $reg->shoe_size );
					$status_label = ( 'confirmed' === $reg->status ) ? __( 'מאושרת', 'shoeinv' ) : __( 'בוטלה', 'shoeinv' );
					$name = trim( esc_html( $reg->first_name ) . ' ' . esc_html( $reg->last_name ) );

					// Build the remove form for confirmed registrations only.
					$remove_form = '';
					if ( 'confirmed' === $reg->status ) {
						$remove_nonce = wp_create_nonce( 'shoeinv_remove_registrant' );
						$remove_url   = esc_url( admin_url( 'admin-post.php' ) );
						$confirm_msg  = esc_js( __( 'להסיר את הנרשמת מהאירוע ולשחרר את מידת הנעל?', 'shoeinv' ) );
						$remove_label = esc_html__( 'הסרה', 'shoeinv' );
						$remove_form  = '<form method="post" action="' . $remove_url . '" style="display:inline">';
						$remove_form .= '<input type="hidden" name="action" value="shoeinv_remove_registrant" />';
						$remove_form .= '<input type="hidden" name="_shoeinv_nonce" value="' . esc_attr( $remove_nonce ) . '" />';
						$remove_form .= '<input type="hidden" name="entry_id" value="' . (int) $reg->entry_id . '" />';
						$remove_form .= '<button type="submit" class="button button-small" onclick="return confirm(\'' . $confirm_msg . '\')">' . $remove_label . '</button>';
						$remove_form .= '</form>';
					}
				?>
					<tr>
						<td><?php echo $name ?: '—'; ?></td>
						<td><?php echo esc_html( $reg->email ?: '—' ); ?></td>
						<td><strong><?php echo esc_html( $shoe ); ?></strong></td>
						<td><?php echo esc_html( $status_label ); ?></td>
						<td><?php echo esc_html( $reg->created_at ); ?></td>
						<td><?php echo $remove_form; ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<?php else : ?>
				<p><?php esc_html_e( 'אין הרשמות לאירוע זה.', 'shoeinv' ); ?></p>
			<?php endif; ?>
			<?php endif; ?>
			<?php endif; ?>
		</div>
		<?php
	}
	/**
	 * Render the plugin settings page.
	 */
	public function render_settings_page() {
		$settings       = Shoeinv_DB::get_settings();
		$size_list      = isset( $settings['size_list'] ) ? (array) $settings['size_list'] : [];
		$max_class_size = isset( $settings['max_class_size'] ) ? (int) $settings['max_class_size'] : 10;
		$size_list_text = implode( "\n", $size_list );

		if ( isset( $_GET['updated'] ) ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'ההגדרות נשמרו.', 'shoeinv' ) . '</p></div>';
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'מלאי נעליים – הגדרות', 'shoeinv' ); ?></h1>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'shoeinv_save_settings', 'shoeinv_settings_nonce' ); ?>
				<input type="hidden" name="action" value="shoeinv_save_settings" />

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="shoeinv_size_list"><?php esc_html_e( 'רשימת מידות (שורה לכל מידה)', 'shoeinv' ); ?></label>
						</th>
						<td>
							<textarea
								id="shoeinv_size_list"
								name="shoeinv_size_list"
								rows="10"
								cols="20"
								class="large-text code"><?php echo esc_textarea( $size_list_text ); ?></textarea>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="shoeinv_max_class_size"><?php esc_html_e( 'גודל כיתה מקסימלי', 'shoeinv' ); ?></label>
						</th>
						<td>
							<input
								type="number"
								id="shoeinv_max_class_size"
								name="shoeinv_max_class_size"
								value="<?php echo esc_attr( $max_class_size ); ?>"
								min="1"
								max="999" />
						</td>
					</tr>
				</table>

				<?php submit_button( __( 'שמור הגדרות', 'shoeinv' ) ); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Handle POST submission from the settings page.
	 */
	public function handle_save_settings() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Forbidden' );
		}

		check_admin_referer( 'shoeinv_save_settings', 'shoeinv_settings_nonce' );

		$size_list = [];
		if ( ! empty( $_POST['shoeinv_size_list'] ) ) {
			$raw       = sanitize_textarea_field( wp_unslash( $_POST['shoeinv_size_list'] ) );
			$size_list = array_filter( array_map( 'trim', explode( "\n", $raw ) ) );
			$size_list = array_values( $size_list );
		}

		Shoeinv_DB::save_settings( [
			'size_list'      => $size_list,
			'max_class_size' => absint( $_POST['shoeinv_max_class_size'] ?? 10 ),
		] );

		$redirect = wp_get_referer() ?: admin_url( 'edit.php?post_type=tribe_events&page=shoeinv-settings' );
		wp_safe_redirect( add_query_arg( 'updated', '1', $redirect ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Reservation Removal
	// -------------------------------------------------------------------------

	/**
	 * Remove a single registrant: release their inventory slot and delete the
	 * RTEC registration row.
	 *
	 * Called via admin-post.php (GET triggers the form, POST handles the action).
	 */
	public function handle_remove_registrant() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Forbidden' );
		}

		check_admin_referer( 'shoeinv_remove_registrant', '_shoeinv_nonce' );

		$entry_id = isset( $_POST['entry_id'] ) ? absint( $_POST['entry_id'] ) : 0;
		if ( $entry_id <= 0 ) {
			wp_safe_redirect( wp_get_referer() );
			exit;
		}

		// 1. Release the inventory slot (no-op if already rolled back).
		Shoeinv_DB::delete_reservation_by_entry( $entry_id );

		// 2. Delete the RTEC registration row directly.
		global $wpdb;
		$wpdb->delete(
			$wpdb->prefix . 'rtec_registrations',
			[ 'id' => $entry_id ],
			[ '%d' ]
		);

		$redirect = remove_query_arg( '_shoeinv_nonce', wp_get_referer() );
		wp_safe_redirect( add_query_arg( 'removed', '1', $redirect ) );
		exit;
	}

	/**
	 * Clean up all reservations when a tribe_events post is permanently deleted.
	 *
	 * @param int $post_id Post ID being deleted.
	 */
	public function handle_event_deletion( $post_id ) {
		if ( get_post_type( $post_id ) !== 'tribe_events' ) {
			return;
		}

		global $wpdb;
		$table = $wpdb->prefix . 'shoeinv_reservations';

		// Release inventory for every confirmed reservation tied to this event.
		$reservations = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, event_id, shoe_size FROM `{$table}` WHERE event_id = %d AND status = %s",
				$post_id,
				'confirmed'
			)
		);

		foreach ( $reservations as $reservation ) {
			Shoeinv_DB::rollback_reserve( (int) $reservation->event_id, $reservation->shoe_size );
		}

		// Delete all reservation rows for this event.
		$wpdb->delete( $table, [ 'event_id' => $post_id ], [ '%d' ] );
	}

	// -------------------------------------------------------------------------
	// Asset Enqueuing
	// -------------------------------------------------------------------------

	/**
	 * Enqueue admin CSS and JS on tribe_events edit screens only.
	 *
	 * @param string $hook Current admin page hook suffix.
	 */
	public function enqueue_assets( $hook ) {
		global $post;

		if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}
		if ( ! $post || 'tribe_events' !== $post->post_type ) {
			return;
		}

		wp_enqueue_style(
			'shoeinv-admin',
			SHOEINV_PLUGIN_URL . 'assets/admin.css',
			[],
			SHOEINV_VERSION
		);
		wp_enqueue_script(
			'shoeinv-admin',
			SHOEINV_PLUGIN_URL . 'assets/admin.js',
			[ 'jquery' ],
			SHOEINV_VERSION,
			true
		);
	}
}
