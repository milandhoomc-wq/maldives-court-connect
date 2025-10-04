-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create courts table
CREATE TABLE public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on courts
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- Create court_schedules table
CREATE TABLE public.court_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(court_id)
);

-- Enable RLS on court_schedules
ALTER TABLE public.court_schedules ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.court_schedules(id) ON DELETE CASCADE NOT NULL,
  display_court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  case_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (admins can manage)
CREATE POLICY "Profiles are viewable by admins"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profiles are insertable by admins"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profiles are updatable by admins"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courts (public read, admin write)
CREATE POLICY "Courts are viewable by everyone"
  ON public.courts FOR SELECT
  USING (TRUE);

CREATE POLICY "Courts are insertable by admins"
  ON public.courts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Courts are updatable by admins"
  ON public.courts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Courts are deletable by admins"
  ON public.courts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for court_schedules (public read, admin write)
CREATE POLICY "Schedules are viewable by everyone"
  ON public.court_schedules FOR SELECT
  USING (TRUE);

CREATE POLICY "Schedules are insertable by admins"
  ON public.court_schedules FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Schedules are updatable by admins"
  ON public.court_schedules FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Schedules are deletable by admins"
  ON public.court_schedules FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bookings (public read and insert, admin full access)
CREATE POLICY "Bookings are viewable by everyone"
  ON public.bookings FOR SELECT
  USING (TRUE);

CREATE POLICY "Bookings are insertable by everyone"
  ON public.bookings FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Bookings are updatable by admins"
  ON public.bookings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Bookings are deletable by admins"
  ON public.bookings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for holidays (public read, admin write)
CREATE POLICY "Holidays are viewable by everyone"
  ON public.holidays FOR SELECT
  USING (TRUE);

CREATE POLICY "Holidays are insertable by admins"
  ON public.holidays FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Holidays are updatable by admins"
  ON public.holidays FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Holidays are deletable by admins"
  ON public.holidays FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courts_updated_at
  BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_court_schedules_updated_at
  BEFORE UPDATE ON public.court_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();