<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) exit;
global $wpdb;
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}shoeinv_audit" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}shoeinv_reservations" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}shoeinv_stock" );
delete_option( 'shoeinv_settings' );
delete_option( 'shoeinv_db_version' );
