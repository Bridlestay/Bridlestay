export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: "guest" | "host" | "admin";
          name: string;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "guest" | "host" | "admin";
          name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: "guest" | "host" | "admin";
          name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      host_profiles: {
        Row: {
          user_id: string;
          stripe_connect_id: string | null;
          payout_enabled: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          stripe_connect_id?: string | null;
          payout_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_connect_id?: string | null;
          payout_enabled?: boolean;
          created_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          description: string;
          address_line: string;
          city: string;
          county: string;
          postcode: string;
          country: string;
          nightly_price_pennies: number;
          max_guests: number;
          max_horses: number;
          verified_facilities: boolean;
          created_at: string;
          updated_at: string;
          lat: number | null;
          lng: number | null;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          description: string;
          address_line: string;
          city: string;
          county: string;
          postcode: string;
          country?: string;
          nightly_price_pennies: number;
          max_guests: number;
          max_horses: number;
          verified_facilities?: boolean;
          created_at?: string;
          updated_at?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          description?: string;
          address_line?: string;
          city?: string;
          county?: string;
          postcode?: string;
          country?: string;
          nightly_price_pennies?: number;
          max_guests?: number;
          max_horses?: number;
          verified_facilities?: boolean;
          created_at?: string;
          updated_at?: string;
          lat?: number | null;
          lng?: number | null;
        };
      };
      property_facilities: {
        Row: {
          property_id: string;
          has_stables: boolean;
          stable_count: number | null;
          has_paddock: boolean;
          paddock_size_acres: number | null;
          has_arena: boolean;
          trailer_parking: boolean;
          water_access: boolean;
          notes: string | null;
        };
        Insert: {
          property_id: string;
          has_stables?: boolean;
          stable_count?: number | null;
          has_paddock?: boolean;
          paddock_size_acres?: number | null;
          has_arena?: boolean;
          trailer_parking?: boolean;
          water_access?: boolean;
          notes?: string | null;
        };
        Update: {
          property_id?: string;
          has_stables?: boolean;
          stable_count?: number | null;
          has_paddock?: boolean;
          paddock_size_acres?: number | null;
          has_arena?: boolean;
          trailer_parking?: boolean;
          water_access?: boolean;
          notes?: string | null;
        };
      };
      property_photos: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          url?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      availability_blocks: {
        Row: {
          id: string;
          property_id: string;
          start_date: string;
          end_date: string;
          reason: "booked" | "blocked";
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          start_date: string;
          end_date: string;
          reason: "booked" | "blocked";
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          start_date?: string;
          end_date?: string;
          reason?: "booked" | "blocked";
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          property_id: string;
          guest_id: string;
          start_date: string;
          end_date: string;
          nights: number;
          base_price_pennies: number;
          guest_fee_pennies: number;
          guest_fee_vat_pennies: number;
          host_fee_pennies: number;
          host_fee_vat_pennies: number;
          total_charge_pennies: number;
          status:
            | "requested"
            | "accepted"
            | "declined"
            | "cancelled"
            | "completed";
          stripe_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          guest_id: string;
          start_date: string;
          end_date: string;
          nights: number;
          base_price_pennies: number;
          guest_fee_pennies: number;
          guest_fee_vat_pennies: number;
          host_fee_pennies: number;
          host_fee_vat_pennies: number;
          total_charge_pennies: number;
          status?:
            | "requested"
            | "accepted"
            | "declined"
            | "cancelled"
            | "completed";
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          guest_id?: string;
          start_date?: string;
          end_date?: string;
          nights?: number;
          base_price_pennies?: number;
          guest_fee_pennies?: number;
          guest_fee_vat_pennies?: number;
          host_fee_pennies?: number;
          host_fee_vat_pennies?: number;
          total_charge_pennies?: number;
          status?:
            | "requested"
            | "accepted"
            | "declined"
            | "cancelled"
            | "completed";
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          property_id: string;
          guest_id: string;
          rating: number;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          property_id: string;
          guest_id: string;
          rating: number;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          property_id?: string;
          guest_id?: string;
          rating?: number;
          body?: string;
          created_at?: string;
        };
      };
      host_replies: {
        Row: {
          id: string;
          review_id: string;
          host_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          host_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          host_id?: string;
          body?: string;
          created_at?: string;
        };
      };
      routes: {
        Row: {
          id: string;
          title: string;
          county: string;
          distance_km: number;
          terrain: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          county: string;
          distance_km: number;
          terrain: string;
          rating?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          county?: string;
          distance_km?: number;
          terrain?: string;
          rating?: number;
          created_at?: string;
        };
      };
      route_pins: {
        Row: {
          id: string;
          route_id: string;
          pin_type: "route" | "viewpoint" | "pub";
          lat: number;
          lng: number;
          note: string | null;
        };
        Insert: {
          id?: string;
          route_id: string;
          pin_type: "route" | "viewpoint" | "pub";
          lat: number;
          lng: number;
          note?: string | null;
        };
        Update: {
          id?: string;
          route_id?: string;
          pin_type?: "route" | "viewpoint" | "pub";
          lat?: number;
          lng?: number;
          note?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}



