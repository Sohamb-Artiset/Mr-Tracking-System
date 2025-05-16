import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserIcon, CalendarIcon, FileIcon, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface MRStats {
  monthlyVisits: number;
  uniqueDoctors: number;
  visitTarget: number; // Placeholder
  visitCompletion: number; // Placeholder
  orderTarget: number; // Placeholder
  orderCompletion: number; // Placeholder
  totalDoctorsInArea: number; // Placeholder
}

interface RecentVisit {
  id: string;
  doctorName: string;
  hospital: string;
  date: string;
  orderCount: number;
}

interface PerformanceData {
  date: string;
  visits: number;
  orders: number; // orders will now represent quantity
}

function isValidDoctor(
  doctor: unknown
): doctor is { name: string; hospital?: string } {
  return (
    doctor !== null &&
    typeof doctor === "object" &&
    !("error" in doctor) &&
    "name" in doctor &&
    typeof (doctor as any).name === "string"
  );
}

export function MRDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MRStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const mrId = user?.id;

      if (!mrId) {
        setError("User not logged in.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch visits and related orders for the current MR
        const { data: visitsData, error: visitsError } = await supabase
          .from("visits")
          .select(`
            id,
            date,
            doctors (name, hospital),
            visit_orders (quantity)
          `)
          .eq("mr_id", mrId)
          .order("date", { ascending: false });

        if (visitsError) {
          throw visitsError;
        }

        // Process data for stats, recent visits, and performance trend
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthlyVisits = 0;
        let monthlyOrderCount = 0;
        const uniqueDoctors = new Set();
        const processedRecentVisits: RecentVisit[] = [];
        const monthlyData: { [key: string]: { visits: number, orders: number } } = {}; // orders will now represent quantity

        if (visitsData) { // Check if visitsData is not null/undefined
          visitsData.forEach(visit => {
            const visitDate = new Date(visit.date);
            const visitMonth = visitDate.getMonth();
            const visitYear = visitDate.getFullYear();

            // Stats
            if (visitMonth === currentMonth && visitYear === currentYear) {
              monthlyVisits++;
              if (Array.isArray(visit.visit_orders)) { // Check if visit_orders is an array
                visit.visit_orders.forEach(order => {
                  monthlyOrderCount += order.quantity; // Summing quantity
                });
              }
            }

            // Unique Doctors
            if (isValidDoctor(visit.doctors)) {
              uniqueDoctors.add(visit.doctors.name);
            }

            // Recent Visits (take up to 5 recent visits)
            if (processedRecentVisits.length < 5) {
              let orderCount = 0;
              if (Array.isArray(visit.visit_orders)) { // Check if visit_orders is an array
                visit.visit_orders.forEach(order => {
                  orderCount += order.quantity;
                });
              }


              processedRecentVisits.push({
                id: visit.id,
                doctorName: isValidDoctor(visit.doctors) ? visit.doctors.name : "N/A",
                hospital: isValidDoctor(visit.doctors) ? visit.doctors.hospital || "N/A" : "N/A",
                date: format(visitDate, "MMM d, yyyy"),
                orderCount: orderCount,
              });
            }

            // Performance Trend (aggregate by month)
            const monthYear = `${visitYear}-${visitMonth + 1}`;
            if (!monthlyData[monthYear]) {
              monthlyData[monthYear] = { visits: 0, orders: 0 }; // orders will now represent quantity
            }
            monthlyData[monthYear].visits++;
            if (Array.isArray(visit.visit_orders)) { // Check if visit_orders is an array
              visit.visit_orders.forEach(order => {
                monthlyData[monthYear].orders += order.quantity; // Summing quantity
              });
            }
          });
        }


        // Format performance trend data for the chart
        const sortedMonths = Object.keys(monthlyData).sort();
        const formattedPerformanceData = sortedMonths.map(monthYear => {
          const [year, month] = monthYear.split("-");
          const date = format(new Date(parseInt(year), parseInt(month) - 1, 1), "MMM yyyy");
          return {
            date: date,
            visits: monthlyData[monthYear].visits,
            orders: monthlyData[monthYear].orders, // orders is now quantity
          };
        });


        setStats({
          monthlyVisits: monthlyVisits,
          uniqueDoctors: uniqueDoctors.size,
          visitTarget: 0, // Placeholder
          visitCompletion: 0, // Placeholder
          orderTarget: 0, // Placeholder
          orderCompletion: 0, // Placeholder
          totalDoctorsInArea: 0, // Placeholder
        });
        setRecentVisits(processedRecentVisits);
        setPerformanceTrend(formattedPerformanceData);

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError(`Failed to load dashboard data: ${error.message}`);
        toast.error("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">MR Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your MR Tracking</p>
          </div>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Monthly Visits</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
          <Card><CardHeader><CardTitle>Total Orders</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
          <Card><CardHeader><CardTitle>Doctors Visited</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Your Performance Trend</CardTitle></CardHeader><CardContent className="h-[300px]">Loading chart...</CardContent></Card>
        <Card><CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader><CardContent>Loading recent visits...</CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">MR Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your MR Tracking</p>
          </div>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Monthly Visits</CardTitle></CardHeader><CardContent className="text-destructive">{error}</CardContent></Card>
          <Card><CardHeader><CardTitle>Total Orders</CardTitle></CardHeader><CardContent className="text-destructive">{error}</CardContent></Card>
          <Card><CardHeader><CardTitle>Doctors Visited</CardTitle></CardHeader><CardContent className="text-destructive">{error}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Your Performance Trend</CardTitle></CardHeader><CardContent className="h-[300px] text-destructive">{error}</CardContent></Card>
        <Card><CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader><CardContent className="text-destructive">{error}</CardContent></Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">MR Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your MR Tracking</p>
        </div>
        <Button onClick={() => navigate("/mr/visits/new")}>
          <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Visits</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthlyVisits ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique Doctors Visited</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueDoctors ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Your Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="visits"
                name="Visits"
                stroke="#0EA5E9"
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#8884d8" // A different color for the orders line
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Visits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Visits</CardTitle>
          <Button variant="ghost" onClick={() => navigate("/mr/visits")}>View all</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentVisits.length === 0 ? (
              <div className="text-center text-muted-foreground">No recent visits found.</div>
            ) : (
              recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="font-medium">{visit.doctorName}</div>
                    <div className="text-sm text-muted-foreground">{visit.hospital}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-sm">{visit.date}</div>
                    <div className="text-xs text-muted-foreground">
                      {visit.orderCount} {visit.orderCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
