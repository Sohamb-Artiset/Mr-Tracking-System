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
  FilePlus,
  Search,
  Edit,
  Trash,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Medicine } from "@/types"; // Assuming Medicine has an 'id' property of type string or number

export function MedicinesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isAddMedicineDialogOpen, setIsAddMedicineDialogOpen] = useState(false);
  const [isEditMedicineDialogOpen, setIsEditMedicineDialogOpen] = useState(false); // State for edit dialog
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null); // State for medicine being edited
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    type: "Tablet",
    category: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("medicines")
        .select("*");

      if (error) throw error;

      setMedicines(data || []);
    } catch (error) {
      console.error("Error fetching medicines:", error);
      toast.error("Failed to load medicines");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMedicines = medicines.filter(
    (medicine) =>
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("medicines")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMedicines(medicines.filter((medicine) => medicine.id !== id));
      toast.success("Medicine deleted successfully");
    } catch (error: any) {
      console.error("Error deleting medicine:", error);
      toast.error(error.message || "Failed to delete medicine");
    }
  };

  const handleAddMedicine = async () => {
    try {
      setIsSubmitting(true);

      // Validate form
      if (!newMedicine.name || !newMedicine.category) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Add the medicine to the database
      const { data, error } = await supabase
        .from("medicines")
        .insert({
          name: newMedicine.name,
          type: newMedicine.type,
          category: newMedicine.category,
          description: newMedicine.description || null
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Add the new medicine to the state
        setMedicines([...medicines, data[0]]);

        toast.success("Medicine added successfully");
        setIsAddMedicineDialogOpen(false);

        // Reset form
        setNewMedicine({
          name: "",
          type: "Tablet",
          category: "",
          description: ""
        });
      }
    } catch (error: any) {
      console.error("Error adding medicine:", error);
      toast.error(error.message || "Failed to add medicine");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open the edit dialog
  const handleEditClick = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsEditMedicineDialogOpen(true);
  };

  // Function to handle updates when editing
  const handleUpdateMedicine = async () => {
    if (!editingMedicine) return;

    try {
      setIsSubmitting(true);

      // Basic validation (similar to add)
      if (!editingMedicine.name || !editingMedicine.category) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Update the medicine in the database
      const { data, error } = await supabase
        .from("medicines")
        .update({
          name: editingMedicine.name,
          type: editingMedicine.type,
          category: editingMedicine.category,
          description: editingMedicine.description || null
        })
        .eq("id", editingMedicine.id)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Update the medicine in the local state
        setMedicines(medicines.map(med => med.id === editingMedicine.id ? data[0] : med));

        toast.success("Medicine updated successfully");
        setIsEditMedicineDialogOpen(false);
        setEditingMedicine(null); // Clear editing state
      }
    } catch (error: any) {
      console.error("Error updating medicine:", error);
      toast.error(error.message || "Failed to update medicine");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Medicines Catalog</h2>
        <Button onClick={() => setIsAddMedicineDialogOpen(true)}>
          <FilePlus className="mr-2 h-4 w-4" />
          Add Medicine
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search medicines by name, category, or type..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse">Loading medicines...</div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No medicines found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicines.map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell>{medicine.category}</TableCell>
                    <TableCell>{medicine.type}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEditClick(medicine)}> {/* Add onClick handler */}
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(medicine.id)}
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

      {/* Add Medicine Dialog */}
      <Dialog open={isAddMedicineDialogOpen} onOpenChange={setIsAddMedicineDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Add a new medicine to the catalog. Fill in all the required information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Medicine Name*</Label>
              <Input
                id="name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                placeholder="Cardiostat"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type*</Label>
                <Select
                  value={newMedicine.type}
                  onValueChange={(value) => setNewMedicine({ ...newMedicine, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Capsule">Capsule</SelectItem>
                    <SelectItem value="Syrup">Syrup</SelectItem>
                    <SelectItem value="Injection">Injection</SelectItem>
                    <SelectItem value="Cream">Cream</SelectItem>
                    <SelectItem value="Ointment">Ointment</SelectItem>
                    <SelectItem value="Drops">Drops</SelectItem>
                    <SelectItem value="Gel">Gel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category*</Label>
                <Input
                  id="category"
                  value={newMedicine.category}
                  onChange={(e) => setNewMedicine({ ...newMedicine, category: e.target.value })}
                  placeholder="Cardiovascular"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                placeholder="Brief description of the medicine"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMedicineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMedicine} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Medicine Dialog */}
      <Dialog open={isEditMedicineDialogOpen} onOpenChange={(isOpen) => {
        setIsEditMedicineDialogOpen(isOpen);
        if (!isOpen) setEditingMedicine(null); // Clear editing state on close
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>
              Update the details for the selected medicine.
            </DialogDescription>
          </DialogHeader>
          {editingMedicine && (
            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Medicine Name*</Label>
                <Input
                  id="edit-name"
                  value={editingMedicine.name}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                  placeholder="Cardiostat"
                />
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type*</Label>
                  <Select
                    value={editingMedicine.type}
                    onValueChange={(value) => setEditingMedicine({ ...editingMedicine, type: value })}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Capsule">Capsule</SelectItem>
                      <SelectItem value="Syrup">Syrup</SelectItem>
                      <SelectItem value="Injection">Injection</SelectItem>
                      <SelectItem value="Cream">Cream</SelectItem>
                      <SelectItem value="Ointment">Ointment</SelectItem>
                      <SelectItem value="Drops">Drops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category*</Label>
                  <Input
                    id="edit-category"
                    value={editingMedicine.category}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, category: e.target.value })}
                    placeholder="Cardiovascular"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Input
                  id="edit-description"
                  value={editingMedicine.description || ""}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, description: e.target.value })}
                  placeholder="Brief description of the medicine"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMedicineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMedicine} disabled={isSubmitting || !editingMedicine}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
