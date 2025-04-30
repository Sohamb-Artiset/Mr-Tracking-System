import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // For potential reset button
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For Date Picker
import { Calendar } from "@/components/ui/calendar"; // For Date Picker
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For Filters
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from "date-fns"; // Import more date-fns functions
import { Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from '@/hooks/useAuth'; // Add this import

interface ReportPageProps {
  userRole: 'admin' | 'mr';
}

interface SupabaseError {
  message: string;
  code?: string;
}

// Define the structure for Report data
interface ReportEntry {
  id: string;
  mrId: string;
  mrName?: string;
  doctorId: string;
  doctor: string;
  medicineId: string;
  medicine: string;
  date: string;
  totalOrder: number; // This will now represent the quantity ordered
  totalValue: number;
  status: string;
  uniqueRowId: string; // Added for unique table keys
}

// Types for filter options
interface FilterOption {
  value: string;
  label: string;
}

const ReportPage: React.FC<ReportPageProps> = ({ userRole }) => {
  const { user } = useAuth(); // Get the current user
  // General state
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search state (for MR view)
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state (for Admin view)
  const [mrOptions, setMrOptions] = useState<FilterOption[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<FilterOption[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<FilterOption[]>([]);
  const [selectedMr, setSelectedMr] = useState<string>('all'); // 'all' or MR ID
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all'); // 'all' or Doctor ID
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all'); // 'all' or Medicine ID
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch initial data and filter options
  useEffect(() => {
    // Reset common state on role change
    setReportData([]);
    setError(null);
    setLoading(true); // Start loading immediately

    if (userRole === 'mr') {
      // Reset MR-specific state
      setSearchTerm('');
      // Reset Admin-specific state just in case
      resetAdminFilters();
      fetchReports(); // Fetch for MR
    } else if (userRole === 'admin') {
      // Reset Admin-specific state
      resetAdminFilters();
      // Reset MR-specific state just in case
      setSearchTerm('');
      // Fetch filter options *then* fetch reports
      fetchFilterOptions().then(() => fetchReports());
    } else {
        setLoading(false); // No role, stop loading
    }
  }, [userRole]);

  const resetAdminFilters = () => {
      setSelectedMr('all');
      setSelectedDoctor('all');
      setSelectedMedicine('all');
      setStartDate(undefined);
      setEndDate(undefined);
  }

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      const [mrs, doctors, medicines] = await Promise.all([
        supabase.from('profiles').select('id, name').eq('role', 'mr'),
        supabase.from('doctors').select('id, name'),
        supabase.from('medicines').select('id, name')
      ]);

      if (mrs.error) throw mrs.error;
      if (doctors.error) throw doctors.error;
      if (medicines.error) throw medicines.error;

      setMrOptions(mrs.data?.map(mr => ({ value: mr.id, label: mr.name })) || []);
      setDoctorOptions(doctors.data?.map(doc => ({ value: doc.id, label: doc.name })) || []);
      setMedicineOptions(medicines.data?.map(med => ({ value: med.id, label: med.name })) || []);

    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error fetching filter options:", error);
      setError(error.message || 'Failed to load filter options.');
      setMrOptions([]);
      setDoctorOptions([]);
      setMedicineOptions([]);
    } finally {
      // Don't set loading false here, fetchReports will do it
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get the current user if not admin
      let userId = null;
      if (userRole !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
        if (!userId) throw new Error('User not found');
      }

      // First, get total count for debugging
      const { count: totalCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true });

      console.log('Total visits in database:', totalCount);

      // Build the main query with left joins
      let query = supabase
        .from('visits')
        .select(`
          id,
          date,
          status,
          mr_id,
          doctors!left (
            id,
            name
          ),
          visit_orders!left (
            id,
            quantity,
            price,
            medicines!left (
              id,
              name
            )
          )
        `);

      // Apply MR filter if not admin
      if (userId) {
        query = query.eq('mr_id', userId);
      }

      // Apply search if provided
      if (searchTerm) {
        query = query.ilike('doctors.name', `%${searchTerm}%`);
      }

      // Execute query
      const { data: visitsData, error: visitsError } = await query.order('date', { ascending: false });

      if (visitsError) throw visitsError;

      console.log('Visits data fetched:', visitsData?.length);

      // Get unique MR IDs from the visits
      const mrIds = [...new Set(visitsData?.map(visit => visit.mr_id) || [])];

      // Fetch MR profiles in a separate query
      const { data: mrProfiles, error: mrProfilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', mrIds);

      if (mrProfilesError) throw mrProfilesError;

      // Create a map of MR IDs to names
      const mrMap = new Map(mrProfiles?.map(profile => [profile.id, profile.name]) || []);

      // Process the data
      const processedData = (visitsData || []).flatMap((visit, visitIndex) => { // Added visitIndex for key fallback
        const orders = visit.visit_orders || [];
        const mrName = mrMap.get(visit.mr_id) || 'N/A';
        const doctorName = visit.doctors?.name || 'N/A';

        // Create a separate entry for each medicine ordered
        return orders.map((order, orderIndex) => ({ // Added orderIndex for key fallback
          // Create a unique ID for the table row key
          uniqueRowId: `${visit.id}-${order.medicines?.id || orderIndex}`, // Combine visit ID and medicine ID/index
          id: visit.id, // Keep original visit ID if needed elsewhere
          mrId: visit.mr_id,
          mrName: mrName,
          doctorId: visit.doctors?.id || '',
          doctor: doctorName,
          medicineId: order.medicines?.id || '',
          medicine: order.medicines?.name || 'N/A',
          date: visit.date,
          totalOrder: order.quantity, // Use the actual quantity from visit_orders
          totalValue: order.quantity * order.price,
          status: visit.status
        }));
      });

      console.log('Processed data length:', processedData.length);
      setReportData(processedData);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to fetch reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic updated for specific filters in Admin view
  const filteredData = useMemo(() => {
    if (userRole === 'mr') {
        // MR View: Simple text search
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (!lowerCaseSearchTerm) return reportData; // No search term, return all
        return reportData.filter(entry =>
            entry.doctor.toLowerCase().includes(lowerCaseSearchTerm) ||
            entry.medicine.toLowerCase().includes(lowerCaseSearchTerm) ||
            entry.date.toLowerCase().includes(lowerCaseSearchTerm) || // Simple date string search for MR
            entry.status.toLowerCase().includes(lowerCaseSearchTerm)
        );
    } else if (userRole === 'admin') {
        // Admin View: Apply specific filters
        return reportData.filter(entry => {
            // MR Filter
            if (selectedMr !== 'all' && entry.mrName !== selectedMr) {
                return false;
            }
            // Doctor Filter
            if (selectedDoctor !== 'all' && entry.doctor !== selectedDoctor) {
                return false;
            }
            // Medicine Filter - Now compares by ID
            if (selectedMedicine !== 'all' && entry.medicineId !== selectedMedicine) {
                return false;
            }

            // Date Range Filter
            // Parse entry.date string for comparison. Assumes 'YYYY-MM-DD' format.
            // Date Range Filter - Using date-fns for robust comparison
            try {
                // Assuming entry.date is in 'YYYY-MM-DD' format from Supabase
                const entryDate = parseISO(entry.date); // Parse the date string

                // Check against start date (inclusive)
                if (startDate && isBefore(entryDate, startOfDay(startDate))) {
                    return false;
                }
                // Check against end date (inclusive)
                if (endDate && isAfter(entryDate, endOfDay(endDate))) {
                    return false;
                }
            } catch (e) {
                console.error("Error parsing or comparing date for filtering:", entry.date, e);
                // If parsing fails, maybe exclude the entry or log more details
                return false; // Exclude if date is invalid for filtering
            }

            return true; // Passes all active filters
        });
    }
    return []; // Default empty if no role matches
  }, [userRole, reportData, searchTerm, selectedMr, selectedDoctor, selectedMedicine, startDate, endDate]);

  // Generic function to render the table, adaptable for both roles
  const renderReportTable = (isAdmin: boolean) => (
    <>
      <h1 className="text-2xl font-bold mb-6">{isAdmin ? 'Admin Visit Reports' : 'My Visit Reports'}</h1>

      {/* Filter Section */}
      {isAdmin ? (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MR Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">MR</label>
              <Select value={selectedMr} onValueChange={setSelectedMr}>
                <SelectTrigger>
                  <SelectValue placeholder="Select MR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All MRs</SelectItem>
                  {mrOptions.map((mr) => (
                    <SelectItem key={mr.value} value={mr.label}>
                      {mr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctorOptions.map((doc) => (
                    <SelectItem key={doc.value} value={doc.label}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicine Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Medicine</label>
              {/* Ensure value is compared against selectedMedicine state (which will hold ID or 'all') */}
              <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                <SelectTrigger>
                  {/* Display the selected medicine's name, or placeholder */}
                  <SelectValue placeholder="Select Medicine">
                    {selectedMedicine === 'all'
                      ? 'All Medicines'
                      : medicineOptions.find(opt => opt.value === selectedMedicine)?.label ?? 'Select Medicine'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Medicines</SelectItem>
                  {/* Set the *value* of the SelectItem to the medicine ID (med.value) */}
                  {medicineOptions.map((med) => (
                    <SelectItem key={med.value} value={med.value}>
                      {med.label} {/* Display the medicine name (med.label) */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={resetAdminFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search reports (Doctor, Medicine, Date, Status)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Loading and Error States */}
      {loading && <p>Loading reports...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>MR Name</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead className="text-right">Total Order</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((entry) => (
                // Use the uniqueRowId generated during processing for the key
                <TableRow key={entry.uniqueRowId}>
                  {isAdmin && <TableCell>{entry.mrName}</TableCell>}
                  <TableCell>{format(parseISO(entry.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{entry.doctor}</TableCell>
                  <TableCell>{entry.medicine}</TableCell>
                  <TableCell className="text-right">{entry.totalOrder}</TableCell>
                  <TableCell className="text-right">₹{entry.totalValue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status.toLowerCase() === 'approved' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center">
                  {searchTerm ? 'No reports match your search.' : 'No reports found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );


  return (
    <div className="container mx-auto py-8">
      {/* Render the appropriate table based on userRole */}
      {userRole === 'admin' && renderReportTable(true)}
      {userRole === 'mr' && renderReportTable(false)}
    </div>
  );
};

export default ReportPage;
