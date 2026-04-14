<?php
/**
 * RTEC Form Integration
 *
 * Hooks into the Really Simple Event Calendar (RTEC) registration flow to:
 *  - Add a shoe-size field to the RTEC form
 *  - Atomically reserve a shoe size before RTEC saves the entry
 *  - Confirm the reservation after RTEC persists the entry
 *  - Roll back the reservation when a registrant unregisters
 *  - Serve real-time size-availability data via AJAX
 *
 * @package Shoeinv_RTEC_Addon
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Shoeinv_RTEC_Integration
 */
class Shoeinv_RTEC_Integration {

    // -------------------------------------------------------------------------
    // Static state (lives for the duration of a single request)
    // -------------------------------------------------------------------------

    /** @var int Event/post ID being registered for */
    private static $pending_event_id = 0;

    /** @var string Shoe size that was atomically reserved */
    private static $pending_size = '';

    /** @var bool Whether an inventory row was actually reserved */
    private static $reserved = false;

    /** @var string Sold-out error message to surface via RTEC field error */
    private static $sold_out_message = '';

    // -------------------------------------------------------------------------
    // Bootstrap
    // -------------------------------------------------------------------------

    /**
     * Wire up all hooks.
     */
    public function __construct() {
        // Register shoe_size field with RTEC
        add_filter( 'rtec_add_new_field',     [ $this, 'add_shoe_size_field' ] );
        add_filter( 'rtec_fields_attributes', [ $this, 'configure_shoe_size_field_atts' ] );

        // Intercept BEFORE RTEC saves: atomic reserve.
        // Priority 5 = before RTEC (which hooks at 10).
        add_action( 'wp_ajax_rtec_process_form_submission',        [ $this, 'intercept_submission' ], 5 );
        add_action( 'wp_ajax_nopriv_rtec_process_form_submission', [ $this, 'intercept_submission' ], 5 );

        // Confirm after RTEC saves entry
        add_action( 'rtec_after_registration_submit', [ $this, 'confirm_reservation' ] );

        // Rollback on unregister (RTEC confirm_unregistration AJAX)
        add_action( 'wp_ajax_rtec_confirm_unregistration',        [ $this, 'intercept_unregister' ], 5 );
        add_action( 'wp_ajax_nopriv_rtec_confirm_unregistration', [ $this, 'intercept_unregister' ], 5 );

        // Frontend assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );

        // AJAX: size availability
        add_action( 'wp_ajax_shoeinv_get_sizes',        [ $this, 'ajax_get_sizes' ] );
        add_action( 'wp_ajax_nopriv_shoeinv_get_sizes', [ $this, 'ajax_get_sizes' ] );
    }

    // -------------------------------------------------------------------------
    // RTEC field registration
    // -------------------------------------------------------------------------

    /**
     * Add shoe_size to RTEC's field registry.
     *
     * @param  array $fields Existing RTEC fields.
     * @return array
     */
    public function add_shoe_size_field( $fields ) {
        $fields['shoe_size'] = [
            'field_name'    => 'shoe_size',
            'field_type'    => 'text',
            'label'         => __( 'מידת נעל', 'shoeinv' ),
            'valid_type'    => 'none',
            'valid_params'  => [],
            'default_value' => '',
            'required'      => true,
            'show'          => true,
        ];
        return $fields;
    }

    /**
     * Configure field attributes (error message, required flag).
     *
     * @param  array $atts Existing field attribute arrays.
     * @return array
     */
    public function configure_shoe_size_field_atts( $atts ) {
        if ( isset( $atts['shoe_size'] ) ) {
            // If a size was just tried and sold out, surface the specific message.
            $msg = self::$sold_out_message
                ? self::$sold_out_message
                : __( 'אנא בחרי מידת נעל', 'shoeinv' );
            $atts['shoe_size']['error_message'] = $msg;
            $atts['shoe_size']['required']      = true;
        }
        return $atts;
    }

    // -------------------------------------------------------------------------
    // Registration interception (priority 5 — runs before RTEC at 10)
    // -------------------------------------------------------------------------

    /**
     * Atomically reserve a shoe size before RTEC persists the registration.
     *
     * If the size is unavailable we blank `$_POST['rtec_shoe_size']` so RTEC's
     * own required-field validation rejects the submission cleanly.
     */
    public function intercept_submission() {
        if ( empty( $_POST['rtec_email_submission'] ) ) return;
        if ( empty( $_POST['rtec_event_id'] ) ) return;

        $event_id = absint( $_POST['rtec_event_id'] );
        if ( ! get_post_meta( $event_id, '_shoeinv_enabled', true ) ) return;

        $shoe_size = isset( $_POST['rtec_shoe_size'] )
            ? sanitize_text_field( wp_unslash( $_POST['rtec_shoe_size'] ) )
            : '';

        if ( empty( $shoe_size ) ) {
            return; // RTEC required-field validation will handle it
        }

        if ( 'BYOS' === $shoe_size ) {
            self::$pending_event_id = $event_id;
            self::$pending_size     = 'BYOS';
            self::$reserved         = false;
            return;
        }

        $reserved = Shoeinv_DB::atomic_reserve( $event_id, $shoe_size );

        if ( ! $reserved ) {
            // Store the specific sold-out message so configure_shoe_size_field_atts
            // can surface it via RTEC's field error mechanism.
            self::$sold_out_message = sprintf(
                /* translators: %s: shoe size */
                __( 'מצטערים, מידה %s אזלה לשיעור זה. אנא בחרי מידה אחרת.', 'shoeinv' ),
                $shoe_size
            );
            // Blank the field so RTEC's required-field validation triggers the error.
            $_POST['rtec_shoe_size'] = '';
            return;
        }

        self::$pending_event_id = $event_id;
        self::$pending_size     = $shoe_size;
        self::$reserved         = true;

        // Safety net: if RTEC's subsequent nonce/validation check terminates the
        // request without firing rtec_after_registration_submit, roll back on shutdown.
        add_action( 'shutdown', [ __CLASS__, 'rollback_if_unconfirmed' ] );
    }

    /**
     * Shutdown handler: roll back any reservation that was never confirmed.
     * Fires only when intercept_submission reserved a slot but confirm_reservation
     * was never called (e.g., RTEC rejected the request at priority 10).
     */
    public static function rollback_if_unconfirmed(): void {
        if ( self::$reserved ) {
            Shoeinv_DB::rollback_reserve( self::$pending_event_id, self::$pending_size );
            self::reset_state();
        }
    }

    // -------------------------------------------------------------------------
    // Post-save confirmation
    // -------------------------------------------------------------------------

    /**
     * After RTEC has written the DB row, link the reserved inventory slot to
     * the new registration entry.
     *
     * Note: The entry ID is not exposed on the $submission object, so we look
     * it up by email + event_id.
     *
     * @param object $submission RTEC submission object.
     */
    public function confirm_reservation( $submission ) {
        if ( ! self::$reserved || '' === self::$pending_size || 'BYOS' === self::$pending_size ) {
            self::reset_state();
            return;
        }

        // Entry ID is not available on the submission object — query by email + event_id.
        global $wpdb;
        $email = '';
        if ( method_exists( $submission, 'get_data' ) ) {
            $data  = $submission->get_data();
            $email = isset( $data['email'] ) ? sanitize_email( $data['email'] ) : '';
        }

        $entry_id = 0;
        if ( $email && self::$pending_event_id ) {
            $entry_id = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT id FROM `{$wpdb->prefix}rtec_registrations`
                 WHERE event_id = %d AND email = %s
                 ORDER BY id DESC LIMIT 1",
                self::$pending_event_id,
                $email
            ) );
        }

        if ( $entry_id > 0 ) {
            Shoeinv_DB::confirm_reservation( $entry_id, self::$pending_event_id, self::$pending_size );
        } else {
            // RTEC saved the entry but we couldn't find it — release the reserved slot.
            Shoeinv_DB::rollback_reserve( self::$pending_event_id, self::$pending_size );
        }

        self::reset_state();
    }

    // -------------------------------------------------------------------------
    // Unregistration rollback (priority 5 — runs before RTEC at 10)
    // -------------------------------------------------------------------------

    /**
     * When a registrant cancels, release their shoe inventory slot.
     *
     * RTEC sends `rtec_event_id` and `rtec_registrant_email` for the
     * `rtec_confirm_unregistration` AJAX action.
     */
    public function intercept_unregister() {
        if ( empty( $_POST['rtec_event_id'] ) ) return;

        $event_id = absint( $_POST['rtec_event_id'] );
        if ( ! get_post_meta( $event_id, '_shoeinv_enabled', true ) ) return;

        $email = isset( $_POST['rtec_registrant_email'] )
            ? sanitize_email( wp_unslash( $_POST['rtec_registrant_email'] ) )
            : '';

        if ( ! is_email( $email ) ) return;

        global $wpdb;
        $entry_id = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM `{$wpdb->prefix}rtec_registrations`
             WHERE event_id = %d AND email = %s AND status != 'c'
             ORDER BY id DESC LIMIT 1",
            $event_id,
            $email
        ) );

        if ( $entry_id > 0 ) {
            Shoeinv_DB::delete_reservation_by_entry( $entry_id );
        }
    }

    // -------------------------------------------------------------------------
    // Frontend assets
    // -------------------------------------------------------------------------

    /**
     * Enqueue the shoe-size dropdown script on RTEC-enabled event pages.
     */
    public function enqueue_frontend_assets() {
        if ( ! function_exists( 'tribe_is_event' ) ) return;
        if ( ! is_singular() ) return;

        $event_id = get_the_ID();
        if ( ! tribe_is_event( $event_id ) ) return;
        if ( ! get_post_meta( $event_id, '_shoeinv_enabled', true ) ) return;

        $settings = Shoeinv_DB::get_settings();

        wp_enqueue_script(
            'shoeinv-frontend',
            SHOEINV_PLUGIN_URL . 'assets/frontend.js',
            [ 'jquery' ],
            SHOEINV_VERSION,
            true
        );

        wp_localize_script( 'shoeinv-frontend', 'shoeinvRTEC', [
            'ajaxUrl' => admin_url( 'admin-ajax.php' ),
            'eventId' => $event_id,
            'sizes'   => $settings['size_list'],
            'nonce'   => wp_create_nonce( 'shoeinv_get_sizes' ),
            'i18n'    => [
                'choose'  => __( 'בחרי מידת נעל *', 'shoeinv' ),
                'byos'    => __( 'אביא נעליים משלי', 'shoeinv' ),
                'label'   => __( 'מידת נעל *', 'shoeinv' ),
                'soldOut' => __( 'אזל המלאי', 'shoeinv' ),
            ],
        ] );
    }

    // -------------------------------------------------------------------------
    // AJAX: size availability
    // -------------------------------------------------------------------------

    /**
     * Return available/sold-out status for every shoe size for a given event.
     */
    public function ajax_get_sizes() {
        check_ajax_referer( 'shoeinv_get_sizes', 'nonce' );

        $event_id = isset( $_POST['event_id'] ) ? absint( $_POST['event_id'] ) : 0;
        if ( $event_id <= 0 ) {
            wp_send_json_error( 'Invalid event ID' );
            return;
        }

        $rows   = Shoeinv_DB::get_stock_for_event( $event_id );
        $result = [];

        foreach ( $rows as $row ) {
            $available = ( (int) $row->reserved_count < (int) $row->total_stock ) ? 'available' : 'sold_out';
            $result[]  = [
                'size'      => $row->shoe_size,
                'available' => $available,
            ];
        }

        // Always add BYOS as available
        $result[] = [ 'size' => 'BYOS', 'available' => 'available' ];

        wp_send_json_success( $result );
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Clear per-request static state after a registration attempt completes.
     */
    private static function reset_state(): void {
        self::$reserved         = false;
        self::$pending_event_id = 0;
        self::$pending_size     = '';
        self::$sold_out_message = '';
    }
}
