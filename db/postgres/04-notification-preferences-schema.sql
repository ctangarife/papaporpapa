-- ==============================================================================
-- PAPAS APP - Notification Preferences (Gentle Nudges)
-- ==============================================================================

-- Table: notification_preferences
CREATE TABLE IF NOT EXISTS auth.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    frequency_hours INTEGER DEFAULT 4 CHECK (frequency_hours IN (1, 2, 4, 6, 12, 24)),
    quiet_hours_start TIME DEFAULT '22:00', -- 10 PM
    quiet_hours_end TIME DEFAULT '08:00',   -- 8 AM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON auth.notification_preferences(user_id);

-- Default values for new users can be set in application logic
COMMENT ON TABLE auth.notification_preferences IS 'User preferences for gentle nudges notifications';
COMMENT ON COLUMN auth.notification_preferences.frequency_hours IS 'Hours between notifications (1, 2, 4, 6, 12, 24)';
COMMENT ON COLUMN auth.notification_preferences.quiet_hours_start IS 'Start of quiet hours (no notifications)';
COMMENT ON COLUMN auth.notification_preferences.quiet_hours_end IS 'End of quiet hours';
COMMENT ON COLUMN auth.notification_preferences.enabled IS 'Whether notifications are enabled for this user';

SELECT public.register_migration('notification_preferences', 1);
