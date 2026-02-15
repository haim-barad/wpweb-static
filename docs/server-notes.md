# Server: 143.198.119.220

- **SSH**: `ssh -i ~/.ssh/barad-4k root@143.198.119.220`
- **OS**: Ubuntu, 8 cores, 16 GB RAM
- **Stack**: Nginx + PHP 8.4 FPM + MySQL 8 + Redis 7.0.15
- **Sites**: 11 WordPress sites sharing one PHP-FPM pool
- **SSH rate limiting**: Too many parallel SSH connections get refused. Use sequential commands.

## Key WordPress Site: aardvarkisrael.com
- **Path**: `/var/www/aardvarkisrael.com`
- **DB name**: `aardvark`
- **PHP-FPM socket**: `/var/run/php/php8.4-fpm.sock`
- **Theme**: Uses Elementor (`_elementor_data` ~29 MB after revision cleanup)
- **Active plugins**: ~31 (was 37, some deactivated)
- **essential-addons-for-elementor-lite** cannot be deactivated — Pro version requires it

## Changes Made (2026-02-15)

### Database Cleanup
- Cleaned Action Scheduler: 48,841 failed/complete/canceled rows + 146,343 logs deleted
- Deleted 88,447 orphaned postmeta rows
- Deleted all 6,647 post revisions
- Added `WP_POST_REVISIONS = 5` to wp-config.php
- Dropped 26 remnant tables from removed plugins (Yoast SEO, LiteSpeed, Mail Bank, Ninja Forms) — ~142 MB freed
- Deleted ~278 orphaned wp_options from those plugins
- Deleted 1,135 Ninja Forms submissions + 13,329 postmeta
- Deleted 32,944 LiteSpeed postmeta rows + 4,081 Yoast postmeta rows
- Cleared 73,981 next3-offload cache postmeta rows (~50 MB) — cache keys only, essential `_next3_*` metadata kept
- **next3 cache vs essential**: keys without underscore prefix (`next3_cache`, `next3_wp_*`, `next3_get_*`) are regenerating caches, safe to delete. Keys with underscore prefix (`_next3_attached_url`, `_next3_bucket`, `_next3_provider`, etc.) track offload locations — DO NOT delete.
- **Total DB reduction**: 1,642 MB → ~470 MB

### PHP-FPM (`/etc/php/8.4/fpm/pool.d/www.conf`)
- `pm.max_children`: 12 → **20**
- `pm.start_servers`: 4 → **6**
- `pm.max_spare_servers`: 6 → **10**

### OPcache (`/etc/php/8.4/fpm/conf.d/10-opcache.ini`)
- `opcache.jit`: `tracing` → **`function`** (tracing mode causes SIGSEGV with php-redis extension on PHP 8.4)
- `opcache.save_comments`: `0` → **`1`** (0 breaks annotation-dependent plugins like Elementor)
- Removed duplicate `opcache.jit=on` line

### Redis Object Cache
- Installed `php8.4-redis` extension
- Installed `redis-cache` plugin (v2.7.0 by Till Krüss)
- Enabled object-cache.php drop-in
- **wp-config.php additions**:
  - `WP_REDIS_PREFIX` = `'aardvark_'`
  - `WP_REDIS_DATABASE` = `1`
- Prefix/database isolation required because all sites share one Redis instance

### MySQL (`/etc/mysql/mysql.conf.d/mysqld.cnf`)
- Added `tmp_table_size = 64M` (was 16M default)
- Added `max_heap_table_size = 64M` (was 16M default)

### WP Rocket
- RUCSS (`remove_unused_css`) was already disabled (set to 0)
- 27K+ failed RUCSS action scheduler entries were cleaned

## Remaining Issues / Future Work
- `wp_postmeta` now 163 MB — `_elementor_data` (29 MB) is all legitimate published/draft content
- `wp_options` autoload: ~0.69 MB (acceptable)
- Still ~31 active plugins — some possibly unused (see plugin audit in conversation)
- No MySQL slow query log enabled
- next3-offload cache will gradually regenerate (~50 MB) as pages are visited — can be re-cleared periodically
