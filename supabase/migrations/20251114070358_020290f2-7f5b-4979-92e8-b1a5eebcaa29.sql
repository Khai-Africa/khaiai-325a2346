-- Update handle_new_user function to handle username collisions gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base username
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Clean username: remove special chars, lowercase, limit length
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  base_username := SUBSTRING(base_username, 1, 20);
  
  final_username := base_username;
  
  -- Handle username collisions by adding random suffix
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    IF counter > 10 THEN
      -- After 10 attempts, use UUID suffix
      final_username := base_username || '_' || SUBSTRING(gen_random_uuid()::text, 1, 8);
      EXIT;
    ELSE
      -- Try with incremental number
      final_username := base_username || '_' || counter;
    END IF;
  END LOOP;
  
  -- Insert profile for new user
  INSERT INTO public.profiles (id, username, mobile_number, created_at)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'mobile_number',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;