
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin Routes
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminDoctors from "./pages/admin/Doctors";
import AdminMedicines from "./pages/admin/Medicines";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";

// MR Routes
import MRDashboard from "./pages/mr/Dashboard";
import NewVisit from "./pages/mr/NewVisit";
import Doctors from "./pages/mr/Doctors";
import NewDoctor from "./pages/mr/NewDoctor"; // Import the new component
import Visits from "./pages/mr/Visits";
import Reports from "./pages/mr/Reports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/doctors" element={<AdminDoctors />} />
          <Route path="/admin/medicines" element={<AdminMedicines />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          
          {/* MR Routes */}
          <Route path="/mr/dashboard" element={<MRDashboard />} />
          <Route path="/mr/visits/new" element={<NewVisit />} />
          <Route path="/mr/doctors" element={<Doctors />} />
          <Route path="/mr/doctors/new" element={<NewDoctor />} /> {/* Add the new route */}
          <Route path="/mr/visits" element={<Visits />} />
          <Route path="/mr/reports" element={<Reports />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
