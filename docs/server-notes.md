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
- `pm.max_requests`: left at **500**

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
- Added `innodb_buffer_pool_size = 2400M` (not yet applied — MySQL not restarted)

### WP Rocket
- RUCSS (`remove_unused_css`) was already disabled (set to 0)
- 27K+ failed RUCSS action scheduler entries were cleaned

## Changes Made (2026-03-01)

### Caching — WP Rocket `cache_reject_ua` fix
- WP Rocket had `(.*)` in `cache_reject_ua` (DB option `wp_rocket_settings`) — matched every user agent, preventing caching for all visitors
- Removed `(.*)` via WP-CLI; remaining entries: `(.*)Googlebot(.*)`, `Googlebot(.*)`
- **Architecture note**: nginx uses FastCGI cache (`/var/cache/nginx/aardvarkisrael_fastcgi/`) — not WP Rocket's file cache. WP Rocket's `advanced-cache.php` drop-in was sending `Cache-Control: no-cache` for all UAs (due to the wildcard), which nginx respects since `fastcgi_ignore_headers` only ignores `Set-Cookie`
- Flushed nginx FastCGI cache after fix so stale no-cache responses are replaced
- **Known limitation**: most bot traffic (AhrefsBot, SemrushBot) uses URLs with `?doing_wp_cron=`, `?order=`, search params — these carry query strings so nginx's `$skip_cache` logic always bypasses cache for them

### Swap
- Created 4GB swap file: `fallocate -l 4G /swapfile && mkswap && swapon`
- Added `/swapfile none swap sw 0 0` to `/etc/fstab` — persistent across reboots
- Server had 0 swap before; OOM kills were instant with no safety margin

### MySQL (`/etc/mysql/mysql.conf.d/mysqld.cnf`)
- `innodb_buffer_pool_size`: live value was **3072MB** (Feb config change to 2400M was never applied — MySQL hadn't been restarted)
- Applied live via `SET GLOBAL innodb_buffer_pool_size = 1258291200` → MySQL rounded to **2048MB** (InnoDB requires multiples of chunk_size × instances = 128MB × 8 = 1024MB)
- Config updated to `2048M` to match live value
- To reach ~1024MB would require changing `innodb_buffer_pool_instances = 1` + MySQL restart (brief downtime)

### PHP-FPM (`/etc/php/8.4/fpm/pool.d/www.conf`)
- `pm.max_children`: 20 → **12**
- `pm.max_spare_servers`: 10 → **8**
- `pm.max_requests`: 500 → **150** (workers recycle 3× faster, limits RSS balloon from ~700MB to ~180MB avg)
- Graceful reload via `systemctl reload php8.4-fpm`

### PHP memory limits
- `WP_MEMORY_LIMIT` (wp-config.php): `3072M` → **`256M`** (frontend requests)
- `WP_MAX_MEMORY_LIMIT` (wp-config.php): not set → **`512M`** (admin/editor operations)
- `php_admin_value[memory_limit]` (pool.d/www.conf): commented out → **`512M`** (hard cap — WordPress cannot exceed this via `ini_set`)
- PHP-FPM reloaded after pool config change

### wp_options autoload cleanup (`aardvark` DB)
- Deleted 10 orphaned autoloaded options:
  - `et_divi` (51KB) — Divi theme settings, theme not installed
  - `wp-short-pixel-prioritySkip` (29KB) — ShortPixel plugin not installed
  - `yst_ga`, `yst_ga_api`, `yst_ga_bounceRate`, `yst_ga_last_wp_run`, `yst_ga_sessions`, `yst_ga_source`, `yst_ga_top_countries`, `yst_ga_top_pageviews` (47KB total) — Yoast GA plugin removed Feb 2026
- Disabled autoload (data kept) for `image-map-pro-wordpress-admin-options` (5.7KB) — plugin inactive
- Autoload total: **0.67MB → 0.54MB** (961 options)
- Flushed Redis object cache after cleanup

### Memory state after all changes
| Component | Before | After |
|---|---|---|
| PHP-FPM total RSS | ~7.9GB (19 workers × 417MB avg) | ~3.4GB (19 workers × 180MB avg) |
| MySQL buffer pool (live) | 3.1GB | 2.0GB |
| Swap | 0 | 4GB |
| RAM available | ~11GB | ~12GB |
- Worst-case ceiling: 12 × ~700MB PHP + 2GB MySQL + 130MB Redis ≈ **10.5GB** (leaves 5GB+ before swap)

## Remaining Issues / Future Work
- `wp_postmeta` now 163 MB — `_elementor_data` (29 MB) is all legitimate published/draft content
- `wp_options` autoload: ~0.54 MB (acceptable)
- Still ~31 active plugins — some possibly unused (see plugin audit in conversation)
- No MySQL slow query log enabled
- next3-offload cache will gradually regenerate (~50 MB) as pages are visited — can be re-cleared periodically
- ~~`WP_MEMORY_LIMIT` fix~~ done (256M + 512M max + hard cap in pool.d)
- MySQL `innodb_buffer_pool_instances = 1` + restart could reduce pool further to ~1024MB if needed
