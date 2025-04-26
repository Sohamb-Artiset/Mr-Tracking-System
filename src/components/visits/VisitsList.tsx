import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Search } from "lucide-react";
import { Visit } from "@/types";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VisitsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const mrId = user?.id;

      if (!mrId) {
        setError("User not logged in.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("visits")
        .select(`
          *,
          doctors (name, hospital),
          visit_orders (*)
        `)
        .eq("mr_id", mrId)
        .order("date", { ascending: false });

      if (error) {
        setError(error.message);
        toast.error("Failed to load visits.");
      } else {
        // Map the fetched data to the Visit type, including doctorName, hospital, and orders
        const formattedVisits = data.map(visit => ({
          ...visit,
          doctorName: visit.doctors?.name || "N/A",
          hospital: visit.doctors?.hospital || "N/A",
          orders: visit.visit_orders || [] // Include fetched orders
        }));
        setVisits(formattedVisits as Visit[]);
      }
      setIsLoading(false);
    };

    fetchVisits();
  }, []);

  // Filter visits based on search term
  const filteredVisits = visits.filter(
    (visit) =>
      visit.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.hospital?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search visits by doctor name or hospital..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled
            />
          </div>
        </div>
        <div className="rounded-md border p-4 text-center">
          Loading visits...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search visits by doctor name or hospital..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled
            />
          </div>
        </div>
        <div className="rounded-md border p-4 text-center text-destructive">
          Error loading visits: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
        <Button onClick={() => navigate("/mr/visits/new")}>
          <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search visits by doctor name or hospital..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead className="hidden md:table-cell">Hospital</TableHead>
              <TableHead className="hidden lg:table-cell">Orders</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No visits found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => (
                <TableRow
                  key={visit.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/mr/visits/${visit.id}`)}
                >
                  <TableCell>
                    {format(new Date(visit.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{visit.doctorName}</TableCell>
                  <TableCell className="hidden md:table-cell">{visit.hospital}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {/* You might need to fetch orders separately or adjust the query */}
                    {visit.orders?.length || 0} items
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      visit.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : visit.status === "pending"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}>
                      {visit.status === "approved"
                        ? "Approved"
                        : visit.status === "pending"
                        ? "Pending"
                        : "Changes Requested"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
