import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { UserIcon, CalendarIcon, FileIcon, UsersIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface VisitOrder {
  quantity: number;
}

interface Visit {
  id: string;
  mr_id: string;
  visit_orders: VisitOrder[];
}

interface MRPerformance {
  name: string;
  visits: number;
  orderValue: number;
}

interface SupabaseError {
  message: string;
  code?: string;
}

interface VisitTrendItem {
  month: string;
  visits: number;
  orders: number;
}

interface PendingApproval {
  id: string; // Changed to string for UUID
  name: string;
  type: 'Visit' | 'User' | 'Doctor' | 'MedicalVisit'; // Added 'Doctor'
  date?: string;
  doctorName?: string;
  email?: string;
  medicalAreaId?: string;
  detailedData?: Tables<'visits'> | Tables<'profiles'> | Tables<'doctors'> | (Tables<'medical_visits'> & { medicalName?: string, profiles: { name: string } | null, medical_visit_orders: { quantity: number; medicines: { name: string } | null }[] }) | null;
}

interface PendingReport {
  id: string;
  date: string;
  status: string;
}

interface PendingVisit {
  id: string;
  date: string;
  doctorName: string;
}

interface MonthlyData {
  [key: string]: {
    visits: number;
    orders: number;
  };
}

interface VisitData {
  date: string;
}

interface OrderData {
  date: string;
}

interface PendingVisitData {
  id: string;
  date: string;
  mr_id: string;
  doctors: {
    name: string;
  };
}

interface MRProfile {
  id: string;
  name: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState({ totalMRs: 0, mrIncrease: 0, totalDoctors: 0, doctorIncrease: 0, totalVisits: 0, visitIncrease: 0, totalMedicals: 0, medicalIncrease: 0 });
  const [visitTrend, setVisitTrend] = useState<VisitTrendItem[]>([]);
  const [topMRs, setTopMRs] = useState<MRPerformance[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingVisit[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [filter, setFilter] = useState<'weekly' | 'daily' | 'all'>('all');


  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch data for stats
      const { count: totalMRs, error: mrsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'mr');
      if (mrsError) throw mrsError;

      const { count: totalDoctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });
      if (doctorsError) throw doctorsError;

      const { count: totalVisits, error: visitsError } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true });
      if (visitsError) throw visitsError;

      const { count: totalMedicals, error: medicalsError } = await supabase
        .from('medicals')
        .select('*', { count: 'exact', head: true });
      if (medicalsError) throw medicalsError;

      // For monthly increases, we would need to fetch data for the previous month as well and compare.
      // This is a simplified implementation fetching only current totals.
      setStats({
        totalMRs: totalMRs || 0,
        mrIncrease: 0, // Placeholder
        totalDoctors: totalDoctors || 0,
        doctorIncrease: 0, // Placeholder
        totalVisits: totalVisits || 0,
        visitIncrease: 0, // Placeholder
        totalMedicals: totalMedicals || 0,
        medicalIncrease: 0, // Placeholder
      });

      // Calculate date 6 months ago
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoISO = sixMonthsAgo.toISOString();

      // Fetch data for visit trend (fetching visits and orders from the last 6 months)
      const { data: allVisits, error: allVisitsError } = await supabase
        .from('visits')
        .select('date')
        .gte('date', sixMonthsAgoISO);
      if (allVisitsError) throw allVisitsError;

      const { data: allOrders, error: allOrdersError } = await supabase
        .from('visits')
        .select('date')
        .gte('date', sixMonthsAgoISO);
      if (allOrdersError) throw allOrdersError;

      // Process visit and order data to get monthly trends
      const monthlyData: MonthlyData = {};
      (allVisits as VisitData[])?.forEach(visit => {
        const month = new Date(visit.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { visits: 0, orders: 0 };
        monthlyData[month].visits++;
      });
      (allOrders as OrderData[])?.forEach(order => {
        const month = new Date(order.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { visits: 0, orders: 0 };
        monthlyData[month].orders++;
      });

      const visitTrendArray: VisitTrendItem[] = Object.keys(monthlyData).map(month => {
        const [monthName, year] = month.split(' ');
        return {
          month,
          visits: monthlyData[month].visits,
          orders: monthlyData[month].orders
        };
      });

      // Sort the months chronologically
      visitTrendArray.sort((a, b) => {
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const aDate = new Date(parseInt(aYear), monthMap[aMonth as keyof typeof monthMap], 1);
        const bDate = new Date(parseInt(bYear), monthMap[bMonth as keyof typeof monthMap], 1);
        return aDate.getTime() - bDate.getTime();
      });
      setVisitTrend(visitTrendArray);


      // Determine date range based on filter
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let startDate: Date | null = null;
      let endDate: Date | null = new Date();

      if (filter === 'weekly') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7); // Last 7 days
      } else if (filter === 'daily') {
        startDate = today; // Today
      } else { // all
        startDate = null; // No start date filter
        endDate = null; // No end date filter
      }

      // Fetch data for top MRs
      const { data: mrsData, error: mrsDataError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'mr');
      if (mrsDataError) throw mrsDataError;

      // Fetch approved visits within the date range
      let query = supabase
        .from('visits')
        .select('id, mr_id')
        .eq('status', 'approved');

      if (startDate) {
        query = query.gte('date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString());
      }

      const { data: approvedVisitsData, error: approvedVisitsError } = await query;

      if (approvedVisitsError) throw approvedVisitsError;

      // Extract visit IDs to fetch their orders
      const visitIds = approvedVisitsData?.map(v => v.id) || [];

      // Fetch all visit_orders for these visits
      let allVisitOrdersData: ({ visit_id: string; quantity: number; })[] = [];
      if (visitIds.length > 0) {
        const { data: ordersDataForVisits, error: ordersErrorForVisits } = await supabase
          .from('visit_orders')
          .select('visit_id, quantity') // Assuming visit_orders has visit_id
          .in('visit_id', visitIds);
        if (ordersErrorForVisits) throw ordersErrorForVisits;
        allVisitOrdersData = ordersDataForVisits || [];
      }

      // Group visit_orders by visit_id for efficient lookup
      const visitOrdersMap = new Map<string, VisitOrder[]>();
      allVisitOrdersData.forEach(order => {
        if (!visitOrdersMap.has(order.visit_id)) {
          visitOrdersMap.set(order.visit_id, []);
        }
        // Ensure the pushed object matches VisitOrder structure
        visitOrdersMap.get(order.visit_id)!.push({ quantity: order.quantity });
      });

      // Construct full visit objects with their orders
      const fullApprovedVisits: Visit[] = approvedVisitsData?.map(v => ({
        id: v.id,
        mr_id: v.mr_id,
        visit_orders: visitOrdersMap.get(v.id) || [] // Attach orders
      })) || [];

      // Calculate visits and order values for each MR
      const mrPerformance: MRPerformance[] = mrsData?.map(mr => {
        const mrSpecificVisits: Visit[] = fullApprovedVisits.filter(visit => visit.mr_id === mr.id);
        
        const totalOrderValue = mrSpecificVisits.reduce((sum, visit) => {
          // visit.visit_orders is now guaranteed to be VisitOrder[]
          const visitValue = visit.visit_orders.reduce((orderSum, orderItem) =>
            orderSum + orderItem.quantity, 0);
          return sum + visitValue;
        }, 0);

        return {
          name: mr.name,
          visits: mrSpecificVisits.length,
          orderValue: totalOrderValue
        };
      }) || [];

      // Sort MRs by visits in descending order
      mrPerformance.sort((a, b) => b.visits - a.visits);

      setTopMRs(mrPerformance);

      // Fetch pending visits with MR information
      const { data: pendingVisitsData, error: pendingVisitsError } = await supabase
        .from('visits')
        .select(`
          id,
          date,
          mr_id,
          doctors(name)
        `)
        .eq('status', 'pending');

      if (pendingVisitsError) throw pendingVisitsError;

      // Get the MR names in a separate query
      const mrIds = (pendingVisitsData as unknown as PendingVisitData[])?.map(visit => visit.mr_id) || [];
      const { data: mrData, error: mrError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', mrIds);

      if (mrError) throw mrError;

      // Create a map of MR IDs to names
      const mrMap = new Map((mrData as unknown as MRProfile[])?.map(mr => [mr.id, mr.name]) || []);

      // Format pending visits data
      const formattedPendingVisits: PendingApproval[] = (pendingVisitsData as unknown as PendingVisitData[])?.map(visit => ({
        id: visit.id, // Removed parseInt
        name: mrMap.get(visit.mr_id) || 'Unknown MR',
        type: 'Visit',
        date: new Date(visit.date).toLocaleDateString(),
        doctorName: visit.doctors?.name
      })) || [];

      // Fetch pending users
      const { data: pendingUsersData, error: pendingUsersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'mr') // Assuming only MRs need user approval
        .eq('status', 'pending');

      if (pendingUsersError) throw pendingUsersError;

      // Format pending users data
      const formattedPendingUsers: PendingApproval[] = (pendingUsersData as unknown as Tables<'profiles'>[])?.map(user => ({ // Corrected type assertion
        id: user.id,
        name: user.name || 'Unknown User',
        type: 'User',
        email: user.email || 'N/A'
      })) || [];

      // Fetch pending doctors (is_verified is false)
      const { data: pendingDoctorsData, error: pendingDoctorsError } = await supabase
        .from('doctors')
        .select('id, name')
        .eq('is_verified', false);

      if (pendingDoctorsError) throw pendingDoctorsError;

      // Format pending doctors data
      const formattedPendingDoctors: PendingApproval[] = (pendingDoctorsData as unknown as Tables<'doctors'>[])?.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        type: 'Doctor',
      })) || [];

      // Fetch pending medical visits
      const { data: pendingMedicalVisitsData, error: pendingMedicalVisitsError } = await supabase
        .from('medical_visits')
        .select('id, visit_date, mr_id')
        .eq('status', 'pending');

      if (pendingMedicalVisitsError) throw pendingMedicalVisitsError;

      // Format pending medical visits data
      const formattedPendingMedicalVisits: PendingApproval[] = (pendingMedicalVisitsData as (Tables<'medical_visits'> & { medical_area_id: string | null })[])?.map(visit => ({
        id: visit.id,
        name: mrMap.get(visit.mr_id) || 'Unknown MR',
        type: 'MedicalVisit',
        date: new Date(visit.visit_date).toLocaleDateString(),
        medicalAreaId: visit.medical_area_id,
        doctorName: 'No doctors assigned', // Keep this for consistency in the interface, but it won't be displayed
      })) || [];

      // Combine all pending approvals
      const allPendingApprovals = [...formattedPendingVisits, ...formattedPendingUsers, ...formattedPendingDoctors, ...formattedPendingMedicalVisits];

      // Update the pendingApprovals state
      setPendingApprovals(allPendingApprovals);
      console.log("Formatted Pending Medical Visits:", formattedPendingMedicalVisits);

    } catch (error: unknown) {
      const supabaseError = error as SupabaseError;
      setError(supabaseError.message);
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filter]); // Added filter to dependency array

  const handleApprove = async (id: string, type: 'Report' | 'Visit' | 'User' | 'Doctor' | 'MedicalVisit') => { // Added 'Doctor'
    setLoading(true);
    setError(null);
    try {
      if (type === 'Report') {
        const { error } = await supabase
          .from('reports')
          .update({ status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'Visit') {
        const { error } = await supabase
          .from('visits')
          .update({ status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'User') {
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'Doctor') { // Added Doctor approval logic
        const { error } = await supabase
          .from('doctors')
          .update({ is_verified: true })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'MedicalVisit') {
        // Assuming 'medical_visits' table and 'status' column
        const { error } = await supabase
          .from('medical_visits')
          .update({ status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      }
      fetchData(); // Refresh data
    } catch (error: unknown) { // Changed any to unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      console.error(`Error approving ${type}:`, error);
      setLoading(false); // Stop loading on error
    }
  };

  const handleReject = async (id: string, type: 'Report' | 'Visit' | 'User' | 'Doctor' | 'MedicalVisit') => { // Added 'Doctor'
    setLoading(true);
    setError(null);
    try {
      if (type === 'Report') {
        const { error } = await supabase
          .from('reports')
          .update({ status: 'rejected' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'Visit') {
        const { error } = await supabase
          .from('visits')
          .update({ status: 'rejected' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'User') {
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'inactive' })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'Doctor') { // Added Doctor rejection logic
        const { error } = await supabase
          .from('doctors')
          .delete() // Assuming rejection means deleting the unverified doctor entry
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'MedicalVisit') {
        // Assuming 'medical_visits' table and 'status' column
        const { error } = await supabase
          .from('medical_visits')
          .update({ status: 'rejected' })
          .eq('id', id);
        if (error) throw error;
      }
      fetchData(); // Refresh data
    } catch (error: unknown) { // Changed any to unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      console.error(`Error rejecting ${type}:`, error);
      setLoading(false); // Stop loading on error
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedApproval(null);
  };

  const handleViewDetails = async (item: PendingApproval) => {
    setLoading(true);
    setError(null);
    console.log("Viewing details for item:", item);
    try {
      let detailedData: Tables<'visits'> | Tables<'profiles'> | Tables<'doctors'> | Tables<'medical_visits'> | null = null;
      if (item.type === 'Visit') {
        const { data, error } = await supabase
          .from('visits')
          .select(`
            *,
            doctors(name),
            profiles(name),
            visit_orders(quantity, medicines(name))
          `)
          .eq('id', item.id)
          .single();
        if (error) throw error;
        detailedData = data;
      } else if (item.type === 'User') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', item.id)
          .single();
        if (error) throw error;
        detailedData = data;
      } else if (item.type === 'Doctor') {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', item.id)
          .single();
        if (error) throw error;
        detailedData = data;
      } else if (item.type === 'MedicalVisit') {
         const { data: medicalVisitData, error: medicalVisitError } = await supabase
          .from('medical_visits')
          .select(`
            *,
            profiles(name),
            medical_visit_orders(quantity, medicines(name))
          `)
          .eq('id', item.id)
          .single();
        if (medicalVisitError) throw medicalVisitError;

        let medicalName = 'N/A';
        console.log("Medical Area ID:", item.medicalAreaId);
        if (item.medicalAreaId) {
          const { data: medicalData, error: medicalError } = await supabase
            .from('medicals')
            .select('name')
            .eq('id', item.medicalAreaId)
            .single();
          console.log("Medical Data Fetch Result:", medicalData, medicalError);
          if (medicalError) console.error("Error fetching medical name:", medicalError);
          medicalName = medicalData?.name || 'N/A';
        }

        detailedData = { ...medicalVisitData, medicalName } as any;

      }
      setSelectedApproval({ ...item, detailedData: detailedData as any });
      setIsPopupOpen(true);
    } catch (error: any) {
      setError(error.message);
      console.error(`Error fetching ${item.type} details:`, error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="text-center">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error loading dashboard data: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to MR Tracking Management</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total MRs</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMRs}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Medicals</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMedicals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Visits/Orders Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Visit Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visitTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="visits" name="Visits" fill="#0EA5E9" />
              <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#0891B2" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top MRs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Performing MRs</CardTitle>
            <ToggleGroup type="single" value={filter} onValueChange={(value: 'weekly' | 'daily' | 'all') => setFilter(value)} size="sm">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
              <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            <div className="max-h-[150px] overflow-y-scroll no-scrollbar">
              <div className="space-y-4">
                {topMRs.map((mr, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {mr.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{mr.name}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium"><p className="text-xs text-muted-foreground">{mr.visits} visits</p></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[140px] overflow-y-auto scrollbar-hide">
              {pendingApprovals.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.type === 'Visit' && (
                      <p className="text-xs text-muted-foreground"><span className="bg-green-200 text-black px-1 rounded">{item.type}</span> • {item.date} • {item.doctorName}</p>
                    )}
                    {item.type === 'User' && (
                      <p className="text-xs text-muted-foreground">{item.type} • {item.email}</p>
                    )}
                    {item.type === 'MedicalVisit' && (
                      <p className="text-xs text-muted-foreground"><span className="bg-blue-200 text-black px-1 rounded">{item.type}</span> • {item.date}</p>
                    )}
                    {item.type === 'Doctor' && (
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(item)}>View Details</Button>
                    <Button variant="outline" size="sm" onClick={() => handleReject(item.id, item.type)}>Reject</Button>
                    <Button size="sm" onClick={() => handleApprove(item.id, item.type)}>Approve</Button>
                  </div>
                </div>
              ))}
              {pendingApprovals.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No pending approvals</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Details Popup */}
      <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedApproval?.type} Details</DialogTitle>
            <DialogDescription>
              Information about the pending {selectedApproval?.type.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedApproval?.type === 'Visit' && selectedApproval.detailedData && (
              <div>
                <div className="flex justify-between">
                  <p><strong>MR Name:</strong> {(selectedApproval.detailedData as Tables<'visits'> & { profiles: { name: string } | null })?.profiles?.name || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date((selectedApproval.detailedData as Tables<'visits'>).date).toLocaleDateString()}</p>
                </div>
                <p><strong>Doctor Name:</strong> {(selectedApproval.detailedData as Tables<'visits'> & { doctors: { name: string } | null })?.doctors?.name || 'N/A'}</p>
                 {(selectedApproval.detailedData as Tables<'visits'> & { visit_orders: { quantity: number; medicines: { name: string } | null }[] })?.visit_orders && (selectedApproval.detailedData as Tables<'visits'> & { visit_orders: { quantity: number; medicines: { name: string } | null }[] }).visit_orders.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mt-4">Visit Orders:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedApproval.detailedData as Tables<'visits'> & { visit_orders: { quantity: number; medicines: { name: string } | null }[] }).visit_orders.map((order: any, orderIndex: number) => (
                          <TableRow key={orderIndex}>
                            <TableCell>{order.medicines?.name || 'N/A'}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="mt-4"><strong>Notes:</strong> {(selectedApproval.detailedData as Tables<'visits'>).notes || 'N/A'}</p>
              </div>
            )}
            {selectedApproval?.type === 'User' && selectedApproval.detailedData && (
              <div>
                <p><strong>User Name:</strong> {(selectedApproval.detailedData as Tables<'profiles'>).name}</p>
                <p><strong>Email:</strong> {(selectedApproval.detailedData as Tables<'profiles'>).email}</p>
                <p><strong>Role:</strong> {(selectedApproval.detailedData as Tables<'profiles'>).role}</p>
                <p><strong>Status:</strong> {(selectedApproval.detailedData as Tables<'profiles'>).status}</p>
                <p><strong>Region:</strong> {(selectedApproval.detailedData as Tables<'profiles'>).region || 'N/A'}</p>
              </div>
            )}
            {selectedApproval?.type === 'Doctor' && selectedApproval.detailedData && (
              <div>
                <p><strong>Doctor Name:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).name}</p>
                <p><strong>Specialization:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).specialization}</p>
                <p><strong>Hospital:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).hospital}</p>
                <p><strong>Address:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).address}</p>
                <p><strong>Phone:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).phone || 'N/A'}</p>
                <p><strong>Email:</strong> {(selectedApproval.detailedData as Tables<'doctors'>).email || 'N/A'}</p>
              </div>
            )}
             {selectedApproval?.type === 'MedicalVisit' && selectedApproval.detailedData && (
              <div>
                <div className="flex justify-between">
                  <p><strong>MR Name:</strong> {(selectedApproval.detailedData as Tables<'medical_visits'> & { profiles: { name: string } | null })?.profiles?.name || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date((selectedApproval.detailedData as Tables<'medical_visits'>).visit_date).toLocaleDateString()}</p>
                </div>
                <p><strong>Medical Name:</strong> {(selectedApproval.detailedData as Tables<'medical_visits'> & { medicalName?: string })?.medicalName || 'N/A'}</p>
                 {(selectedApproval.detailedData as Tables<'medical_visits'> & { medical_visit_orders: { quantity: number; medicines: { name: string } | null }[] })?.medical_visit_orders && (selectedApproval.detailedData as Tables<'medical_visits'> & { medical_visit_orders: { quantity: number; medicines: { name: string } | null }[] }).medical_visit_orders.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mt-4">Medical Visit Orders:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedApproval.detailedData as Tables<'medical_visits'> & { medical_visit_orders: { quantity: number; medicines: { name: string } | null }[] }).medical_visit_orders.map((order: any, orderIndex: number) => (
                          <TableRow key={orderIndex}>
                            <TableCell>{order.medicines?.name || 'N/A'}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="mt-4"><strong>Notes:</strong> {(selectedApproval.detailedData as Tables<'medical_visits'>).notes || 'N/A'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={handleClosePopup}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper components for AdminDashboard
function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-9 w-9 rounded-full flex items-center justify-center overflow-hidden">
      {children}
    </div>
  );
}

function AvatarFallback({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}
