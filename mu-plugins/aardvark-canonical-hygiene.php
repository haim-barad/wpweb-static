<?php
/**
 * Plugin Name: Aardvark - Canonical Hygiene
 * Description: Stops a page that declares a canonical elsewhere from competing with that canonical. Two mechanisms: it keeps such pages out of the XML sitemap (Rank Math implements this but gates it behind a filter defaulting to false), and it stops Rank Math Pro's video module from generating duplicate VideoObject schema on them.
 * Author: WPWeb.org
 * Version: 2.0.0
 *
 * Supersedes aardvark-sitemap-canonical-exclude.php, which did the sitemap half only.
 */

defined( 'ABSPATH' ) || exit;

/*
 * Keep canonicalised URLs out of the post-type sitemaps.
 *
 * Rank Math already implements this in
 * modules/sitemap/providers/class-post-type.php::maybe_update_query_to_exclude_posts_with_canonical_urls
 * but defaults the filter to false, so by default a canonicalised URL is still submitted for
 * indexing while its own head points somewhere else.
 *
 * "exlude" is Rank Math's own spelling of the hook, not a typo here. Correcting the spelling
 * silently disables the filter.
 */
add_filter( 'rank_math/sitemap/exlude_posts_with_canonical_urls', '__return_true' );

add_filter( 'rank_math/video/parser_content', 'aardvark_skip_video_parsing_when_canonicalised', 10, 2 );

/**
 * Hide content from Rank Math Pro's video parser on pages that canonicalise elsewhere.
 *
 * The parser scans this string for embeds and writes one rank_math_schema_VideoObject record per
 * video it finds. Returning an empty string means it finds nothing, so it creates nothing.
 *
 * Without this, removing duplicate video schema from a canonicalised page only holds until the
 * next save, when the parser re-detects the same embeds and recreates the records — which is how
 * the same four tutorial videos ended up marked up on two URLs in the first place.
 *
 * @param string  $content Content the parser is about to scan.
 * @param WP_Post $post    Post being parsed.
 *
 * @return string Empty string to suppress detection, otherwise the content unchanged.
 */
function aardvark_skip_video_parsing_when_canonicalised( $content, $post ) {
	if ( ! $post instanceof WP_Post ) {
		return $content;
	}

	$canonical = trim( (string) get_post_meta( $post->ID, 'rank_math_canonical_url', true ) );

	if ( '' === $canonical ) {
		return $content;
	}

	// A self-referencing canonical is the ordinary case and must not suppress anything.
	$permalink = get_permalink( $post->ID );
	if ( $permalink && untrailingslashit( $canonical ) === untrailingslashit( $permalink ) ) {
		return $content;
	}

	return '';
}
