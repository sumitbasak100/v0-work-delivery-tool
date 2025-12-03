-- This script adds the relationship for fetching user info with projects
-- Run this after the initial schema is created

-- Ensure the foreign key exists (it should from the initial schema)
-- This is just for reference

-- The projects table already references users(id) via user_id
-- We can query like: SELECT projects.*, users.email, users.name FROM projects JOIN users ON users.id = projects.user_id
