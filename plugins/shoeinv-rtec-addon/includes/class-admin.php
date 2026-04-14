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
			__( 'מלאי נעליים', 'shoeinv' ),
			__( 'מלאי נעליים', 'shoeinv' ),
			'manage_options',
			'shoeinv-settings',
			[ $this, 'render_settings_page' ]
		);
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
