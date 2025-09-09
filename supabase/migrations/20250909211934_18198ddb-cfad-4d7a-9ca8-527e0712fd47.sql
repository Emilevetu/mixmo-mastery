-- Fix the trigger to properly extract pseudo from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, pseudo)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'pseudo', 'Joueur' || substr(NEW.id::text, 1, 8))
    );
    RETURN NEW;
END;
$$;