-- Create a simple version of create_user_profile_safe function

CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
    user_id UUID,
    user_email TEXT,
    display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    final_display_name TEXT;
BEGIN
    -- Ensure we have a valid display name
    final_display_name := COALESCE(
        display_name,
        CASE 
            WHEN user_email LIKE '%@%' THEN 
                COALESCE(split_part(user_email, '@', 1), 'Player')
            ELSE 'Player'
        END
    );
    
    -- Ensure the display name is not empty or "Unknown Player"
    IF final_display_name = '' OR final_display_name = 'Unknown Player' THEN
        final_display_name := CASE 
            WHEN user_email LIKE '%@%' THEN 
                COALESCE(split_part(user_email, '@', 1), 'Player')
            ELSE 'Player'
        END;
    END IF;
    
    -- Insert user profile
    INSERT INTO public.users (
        id,
        email,
        display_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        final_display_name,
        'player',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        updated_at = NOW();
    
    -- Insert user points (simplified to avoid conflicts)
    INSERT INTO public.user_points (
        user_id,
        betting_points,
        stream_points,
        total_betting_points_earned,
        total_stream_points_earned,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        50,  -- Starting betting points
        0,   -- Starting stream points
        0,   -- Total earned betting points
        0,   -- Total earned stream points
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'user_id', user_id,
        'display_name', final_display_name,
        'message', 'User profile and points created successfully'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', user_id
        );
        
        RAISE WARNING 'Error in create_user_profile_safe: %', SQLERRM;
        RETURN result;
END;
$$;

-- Test the function
SELECT 'Function create_user_profile_safe created successfully' as status; 