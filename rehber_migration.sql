CREATE TABLE IF NOT EXISTS public.rehber_prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    school_name TEXT NOT NULL,
    district TEXT NOT NULL,
    principal_name TEXT NOT NULL,
    principal_phone TEXT NOT NULL,
    meeting_status TEXT DEFAULT 'yapılmadı'::text NOT NULL,
    presentation_status BOOLEAN DEFAULT false NOT NULL,
    photoshoot_status BOOLEAN DEFAULT false NOT NULL
);

-- RLS policies
ALTER TABLE public.rehber_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read rehber_prospects"
    ON public.rehber_prospects
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert rehber_prospects"
    ON public.rehber_prospects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rehber_prospects"
    ON public.rehber_prospects
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete rehber_prospects"
    ON public.rehber_prospects
    FOR DELETE
    TO authenticated
    USING (true);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to read notifications"
    ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to insert notifications"
    ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated to update notifications"
    ON public.notifications FOR UPDATE TO authenticated USING (true);
