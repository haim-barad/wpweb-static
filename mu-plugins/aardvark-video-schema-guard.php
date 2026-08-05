<?php
/**
 * Plugin Name: Aardvark - VideoObject Schema Guard
 * Description: Removes incomplete VideoObject nodes from Rank Math's JSON-LD output. Rank Math Pro's video module stores auto-generated schema as template variables (%seo_description%, %post_thumbnail%); when a post has no meta description or featured image those resolve to empty and the required field is silently dropped, which Search Console reports as a structured data error. This drops the whole node instead of shipping a half-populated one.
 * Author: WPWeb.org
 * Version: 1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Fields Google requires on VideoObject for video rich results.
 *
 * @var array
 */
const AARDVARK_VIDEO_REQUIRED_FIELDS = [ 'name', 'description', 'thumbnailUrl', 'uploadDate' ];

add_filter( 'rank_math/json_ld', 'aardvark_drop_incomplete_video_schema', 99, 2 );

/**
 * Drop VideoObject nodes that are missing a required field.
 *
 * Nothing else in Rank Math's graph references a VideoObject by @id -- the
 * relationship runs the other way, via isPartOf/publisher -- so removing a
 * node cannot leave a dangling reference behind.
 *
 * @param array $data   The JSON-LD graph, keyed by node slug.
 * @param mixed $jsonld Rank Math JsonLD instance. Unused.
 *
 * @return array
 */
function aardvark_drop_incomplete_video_schema( $data, $jsonld ) {
	if ( ! is_array( $data ) ) {
		return $data;
	}

	foreach ( $data as $key => $node ) {
		if ( ! is_array( $node ) || ! aardvark_is_video_node( $node ) ) {
			continue;
		}

		foreach ( AARDVARK_VIDEO_REQUIRED_FIELDS as $field ) {
			if ( aardvark_schema_field_is_empty( $node, $field ) ) {
				unset( $data[ $key ] );
				break;
			}
		}
	}

	return $data;
}

/**
 * Is this graph node a VideoObject? @type may be a string or an array.
 *
 * @param array $node A single JSON-LD node.
 *
 * @return bool
 */
function aardvark_is_video_node( $node ) {
	if ( ! isset( $node['@type'] ) ) {
		return false;
	}

	$types = is_array( $node['@type'] ) ? $node['@type'] : [ $node['@type'] ];

	return in_array( 'VideoObject', $types, true );
}

/**
 * Treat missing, blank, and unresolved-variable values as empty.
 *
 * An unresolved Rank Math variable (%seo_description%) means the source field
 * was never populated, so the node is just as incomplete as if the key were
 * absent -- and shipping the literal token to Google is worse than omitting it.
 *
 * @param array  $node  A single JSON-LD node.
 * @param string $field Field name to test.
 *
 * @return bool
 */
function aardvark_schema_field_is_empty( $node, $field ) {
	if ( ! isset( $node[ $field ] ) ) {
		return true;
	}

	$value = $node[ $field ];

	// ImageObject-style nested values count as present if any leaf is non-empty.
	if ( is_array( $value ) ) {
		return empty( array_filter( $value ) );
	}

	$value = trim( (string) $value );

	if ( '' === $value ) {
		return true;
	}

	return (bool) preg_match( '/^%[a-z0-9_()\-:,\/ ]+%$/i', $value );
}
