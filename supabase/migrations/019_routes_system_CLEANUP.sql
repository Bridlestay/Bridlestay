-- Cleanup script for routes system
-- Run this FIRST if you get "column does not exist" errors

-- Drop all routes-related tables if they exist (CASCADE removes dependent objects)
drop table if exists route_comment_flags cascade;
drop table if exists route_comments cascade;
drop table if exists route_reviews cascade;
drop table if exists route_waypoints cascade;
drop table if exists route_photos cascade;
drop table if exists routes cascade;

-- Now you can run 019_routes_system.sql cleanly



