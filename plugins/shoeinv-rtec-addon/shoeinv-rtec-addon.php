<?php
/**
 * Plugin Name: Shoe Inventory for RTEC
 * Description: Per-size shoe inventory on RTEC registration forms for ג'אמפ/קנגו events.
 * Version: 1.0.0
 * Author: WPWeb
 * Text Domain: shoeinv
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'SHOEINV_VERSION',     '1.0.0' );
define( 'SHOEINV_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'SHOEINV_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );
define( 'SHOEINV_PLUGIN_FILE', __FILE__ );

// Activator must be available before plugins_loaded for the activation hook.
require_once SHOEINV_PLUGIN_DIR . 'includes/class-activator.php';
register_activation_hook( __FILE__, [ 'Shoeinv_Activator', 'activate' ] );

add_action( 'plugins_loaded', 'shoeinv_rtec_init' );

function shoeinv_rtec_init() {
    // Dependency check: bail silently if RTEC or TEC not active.
    if ( ! class_exists( 'Tribe__Events__Main' ) ) {
        add_action( 'admin_notices', function() {
            echo '<div class="notice notice-error"><p>' .
                 esc_html__( 'Shoe Inventory for RTEC requires The Events Calendar and Registrations for The Events Calendar to be active.', 'shoeinv' ) .
                 '</p></div>';
        } );
        return;
    }

    require_once SHOEINV_PLUGIN_DIR . 'includes/class-db.php';
    require_once SHOEINV_PLUGIN_DIR . 'includes/class-rtec-integration.php';
    require_once SHOEINV_PLUGIN_DIR . 'includes/class-admin.php';

    new Shoeinv_RTEC_Integration();
    new Shoeinv_Admin();
}
