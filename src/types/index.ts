
// Import our supabase types
import { Tables } from "./supabase";

// Re-export for use in our application
export type User = Tables<'profiles'>;
export type Doctor = Tables<'doctors'>;
export type Medicine = Tables<'medicines'>;
export type Visit = Tables<'visits'> & {
  doctorName?: string;
  hospital?: string;
  orders?: any[];
};
export type VisitOrder = Tables<'visit_orders'>;
export type ReportType = Tables<'reports'>; // Export ReportType
export type Report = ReportType & {
  mrName?: string;
  doctorName?: string;
  medicineName?: string;
};

// Define additional types that aren't directly from the database
export interface UserWithAuth extends User {
  auth?: {
    email?: string;
    password?: string;
  }
}
