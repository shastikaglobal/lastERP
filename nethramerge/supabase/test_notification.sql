-- Test script to insert a notification for the current user's company
DO $$
DECLARE
    _company_id UUID;
    _user_id UUID;
BEGIN
    -- Get current company from profile
    -- Assuming we are running this as a superuser or the user themselves in SQL editor
    -- But since I don't know the exact user, I'll just pick one profile
    SELECT company_id, id INTO _company_id, _user_id FROM public.profiles LIMIT 1;

    IF _company_id IS NOT NULL THEN
        INSERT INTO public.app_notifications (company_id, user_id, title, body, type)
        VALUES (
            _company_id,
            _user_id,
            'System Verification',
            'This is a test notification to verify the notification center is functional.',
            'success'
        );
    END IF;
END $$;
