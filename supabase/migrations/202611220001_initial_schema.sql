
-- ============================================
-- MarketplaceOS - Initial Database Schema
-- ============================================

-- 1. USER PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically create a profile when a user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- 2. VENDORS
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    description TEXT,
    city TEXT,
    gst_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. SERVICES
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. BOOKINGS
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id),
    service_id UUID REFERENCES public.services(id),
    event_date DATE NOT NULL,
    event_location TEXT NOT NULL,
    guest_count INTEGER CHECK (guest_count > 0),
    customer_message TEXT,
    quoted_amount NUMERIC(12,2) CHECK (quoted_amount >= 0),
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN (
            'requested',
            'quoted',
            'confirmed',
            'completed',
            'cancelled'
        )),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. TRANSACTIONS
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL
        CHECK (payment_type IN ('advance', 'balance', 'refund')),
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. REVIEWS
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));


-- ============================================
-- VENDOR POLICIES
-- ============================================

CREATE POLICY "Approved vendors are publicly visible"
ON public.vendors
FOR SELECT
TO anon, authenticated
USING (
    status = 'approved'
    OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can register as vendors"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));


-- ============================================
-- SERVICE POLICIES
-- ============================================

CREATE POLICY "Active services are publicly visible"
ON public.services
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.status = 'approved'
    )
    OR EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Vendors can add their own services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Vendors can update their own services"
ON public.services
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Vendors can delete their own services"
ON public.services
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = services.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
);


-- ============================================
-- BOOKING POLICIES
-- ============================================

CREATE POLICY "Customers and relevant vendors can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    customer_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.vendors
        WHERE vendors.id = bookings.vendor_id
        AND vendors.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Customers can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (customer_id = (SELECT auth.uid()));


-- ============================================
-- TRANSACTION POLICIES
-- ============================================

CREATE POLICY "Booking participants can view transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.bookings
        LEFT JOIN public.vendors
            ON vendors.id = bookings.vendor_id
        WHERE bookings.id = transactions.booking_id
        AND (
            bookings.customer_id = (SELECT auth.uid())
            OR vendors.user_id = (SELECT auth.uid())
        )
    )
);


-- ============================================
-- REVIEW POLICIES
-- ============================================

CREATE POLICY "Reviews are publicly visible"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "Customers can review completed bookings"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.bookings
        WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = (SELECT auth.uid())
        AND bookings.vendor_id = reviews.vendor_id
        AND bookings.status = 'completed'
    )
);
