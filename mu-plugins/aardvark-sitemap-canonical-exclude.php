<?php
/**
 * Plugin Name: Aardvark - Exclude Canonicalised Pages From Sitemap
 * Description: Keeps a page out of the XML sitemap when it declares a different canonical. Rank Math already implements this (see modules/sitemap/providers/class-post-type.php, maybe_update_query_to_exclude_posts_with_canonical_urls) but gates it behind a filter defaulting to false, so by default a canonicalised URL is still advertised for indexing while its own head points somewhere else. Submitting non-canonical URLs in a sitemap is a contradictory signal and Google advises against it.
 * Author: WPWeb.org
 * Version: 1.0.0
 */

defined( 'ABSPATH' ) || exit;

/*
 * "exlude" is Rank Math's own spelling of this hook, not a typo here.
 * Correcting it silently disables the filter.
 */
add_filter( 'rank_math/sitemap/exlude_posts_with_canonical_urls', '__return_true' );
