
import { useState, useEffect } from "react";
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
import {
  MoreHorizontal,
  UserPlus,
  Search,
  Edit,
  Trash,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Doctor } from "@/types";

export function DoctorsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    specialty: "",
    hospital: "",
    city: "",
    address: "",
    email: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      
      // Fetch doctors from Supabase
      const { data, error } = await supabase
        .from("doctors")
        .select("*");
        
      if (error) throw error;
      
      setDoctors(data || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.address && doctor.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleVerify = async (id: string) => {
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ is_verified: true })
        .eq("id", id);
        
      if (error) throw error;
      
      setDoctors(
        doctors.map((doctor) =>
          doctor.id === id ? { ...doctor, is_verified: true } : doctor
        )
      );
      
      toast.success("Doctor verified successfully");
    } catch (error: any) {
      console.error("Error verifying doctor:", error);
      toast.error(error.message || "Failed to verify doctor");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("doctors")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      setDoctors(doctors.filter((doctor) => doctor.id !== id));
      toast.success("Doctor deleted successfully");
    } catch (error: any) {
      console.error("Error deleting doctor:", error);
      toast.error(error.message || "Failed to delete doctor");
    }
  };

  const handleAddDoctor = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!newDoctor.name || !newDoctor.specialty || !newDoctor.hospital || !newDoctor.address) {
        toast.error("Please fill in all required fields");
        return;
      }
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to add a doctor");
      }
      
      // Create full address
      const fullAddress = newDoctor.city 
        ? `${newDoctor.address}, ${newDoctor.city}`
        : newDoctor.address;
      
      // Add the doctor to the database
      const { data, error } = await supabase
        .from("doctors")
        .insert({
          name: newDoctor.name,
          specialization: newDoctor.specialty,
          hospital: newDoctor.hospital,
          address: fullAddress,
          email: newDoctor.email || null,
          phone: newDoctor.phone || null,
          added_by: user.id,
          is_verified: true // Auto-verify when admin adds
        })
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Add the new doctor to the state
        setDoctors([...doctors, data[0]]);
        
        toast.success("Doctor added successfully");
        setIsAddDoctorDialogOpen(false);
        
        // Reset form
        setNewDoctor({
          name: "",
          specialty: "",
          hospital: "",
          city: "",
          address: "",
          email: "",
          phone: "",
        });
      }
    } catch (error: any) {
      console.error("Error adding doctor:", error);
      toast.error(error.message || "Failed to add doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Doctors Management</h2>
        <Button onClick={() => setIsAddDoctorDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search doctors by name, specialty, hospital, or city..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse">Loading doctors...</div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead className="hidden md:table-cell">Hospital</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No doctors found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell">{doctor.hospital}</TableCell>
                    <TableCell className="hidden md:table-cell">{doctor.address}</TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        doctor.is_verified
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {doctor.is_verified ? "Verified" : "Pending"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!doctor.is_verified && (
                            <DropdownMenuItem onClick={() => handleVerify(doctor.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Verify
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(doctor.id)}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Add Doctor Dialog */}
      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Add a new doctor to the system. Fill in all the required information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name*</Label>
                <Input
                  id="name"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  placeholder="Dr. John Smith"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialty">Specialty*</Label>
                <Input
                  id="specialty"
                  value={newDoctor.specialty}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  placeholder="Cardiology"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="hospital">Hospital / Clinic*</Label>
              <Input
                id="hospital"
                value={newDoctor.hospital}
                onChange={(e) => setNewDoctor({ ...newDoctor, hospital: e.target.value })}
                placeholder="City General Hospital"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="address">Address*</Label>
                <Input
                  id="address"
                  value={newDoctor.address}
                  onChange={(e) => setNewDoctor({ ...newDoctor, address: e.target.value })}
                  placeholder="123 Medical Ave"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newDoctor.city}
                  onChange={(e) => setNewDoctor({ ...newDoctor, city: e.target.value })}
                  placeholder="Health City"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  placeholder="john.smith@hospital.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newDoctor.phone}
                  onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  placeholder="555-123-4567"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDoctorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDoctor} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
