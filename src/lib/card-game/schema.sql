-- ============================================
-- NetRun Card Game - Supabase Schema
-- Run this in your Supabase SQL Editor to
-- enable multiplayer and rankings features
-- ============================================

-- Lobby rooms for multiplayer matchmaking
CREATE TABLE IF NOT EXISTS netrun_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "hostId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "hostName" TEXT NOT NULL DEFAULT 'Runner',
  "guestId" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "guestName" TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing', 'finished')),
  "hostDeckId" TEXT NOT NULL DEFAULT 'starter',
  "guestDeckId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player rankings / leaderboard
CREATE TABLE IF NOT EXISTS netrun_rankings (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Runner',
  elo INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'script_kiddie' CHECK (rank IN ('script_kiddie', 'hacker', 'netrunner', 'elite_runner', 'ghost_in_the_machine'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_netrun_rooms_status ON netrun_rooms(status);
CREATE INDEX IF NOT EXISTS idx_netrun_rooms_host ON netrun_rooms("hostId");
CREATE INDEX IF NOT EXISTS idx_netrun_rankings_elo ON netrun_rankings(elo DESC);

-- Row Level Security policies
ALTER TABLE netrun_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE netrun_rankings ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone can read, authenticated users can create/update
CREATE POLICY "Anyone can view rooms" ON netrun_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON netrun_rooms
  FOR INSERT WITH CHECK (auth.uid() = "hostId");

CREATE POLICY "Room participants can update" ON netrun_rooms
  FOR UPDATE USING (
    auth.uid() = "hostId" OR auth.uid() = "guestId"
  );

CREATE POLICY "Host can delete room" ON netrun_rooms
  FOR DELETE USING (auth.uid() = "hostId");

-- Rankings: anyone can read, users can insert/update their own
CREATE POLICY "Anyone can view rankings" ON netrun_rankings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own ranking" ON netrun_rankings
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own ranking" ON netrun_rankings
  FOR UPDATE USING (auth.uid() = "userId");

-- Enable realtime for rooms (for lobby updates)
ALTER PUBLICATION supabase_realtime ADD TABLE netrun_rooms;

-- Auto-cleanup old rooms (optional: run as a cron job or edge function)
-- DELETE FROM netrun_rooms WHERE status = 'waiting' AND "createdAt" < NOW() - INTERVAL '1 hour';
-- DELETE FROM netrun_rooms WHERE status = 'finished' AND "createdAt" < NOW() - INTERVAL '24 hours';
