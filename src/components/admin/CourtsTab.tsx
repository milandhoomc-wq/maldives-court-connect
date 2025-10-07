import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

type Court = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const CourtsTab = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCourt) {
        const { error } = await supabase
          .from("courts")
          .update({
            name: formData.name,
            location: formData.location,
            description: formData.description || null,
          })
          .eq("id", editingCourt.id);

        if (error) throw error;
        toast.success("Court updated successfully");
      } else {
        const { error } = await supabase
          .from("courts")
          .insert({
            name: formData.name,
            location: formData.location,
            description: formData.description || null,
          });

        if (error) throw error;
        toast.success("Court created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchCourts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("courts")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Court ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchCourts();
    } catch (error: any) {
      toast.error("Error updating court status: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("courts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Court deleted successfully");
      fetchCourts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredCourts = courts.filter((court) => {
    const query = searchQuery.toLowerCase();
    return (
      court.name.toLowerCase().includes(query) ||
      court.location.toLowerCase().includes(query) ||
      (court.description?.toLowerCase().includes(query) || false)
    );
  });

  const openDialog = (court?: Court) => {
    if (court) {
      setEditingCourt(court);
      setFormData({
        name: court.name,
        location: court.location,
        description: court.description || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCourt(null);
    setFormData({
      name: "",
      location: "",
      description: "",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Courts Management</CardTitle>
              <CardDescription>Manage court information and activation status</CardDescription>
            </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Court
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCourt ? "Edit Court" : "Add Court"}</DialogTitle>
                  <DialogDescription>
                    {editingCourt ? "Update court information" : "Create a new court"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Sh.Milandhoo Magistrate Court"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Sh.Milandhoo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Additional court information"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCourt ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courts by name, location, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {filteredCourts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {courts.length === 0 ? "No courts found. Create your first court to get started." : "No courts match your search."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourts.map((court) => (
                <TableRow key={court.id} className={court.is_active ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {court.name}
                      {court.is_active && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{court.location}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {court.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={court.is_active}
                        onCheckedChange={() => handleToggleActive(court.id, court.is_active)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {court.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(court)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Court</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this court? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(court.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CourtsTab;
