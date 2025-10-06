import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Court = {
  id: string;
  name: string;
  location: string;
};

type Booking = {
  id: string;
  court_id: string;
  display_court_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  case_number: string;
  display_court?: Court;
};

type BookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId?: string;
  date?: Date;
  startTime?: string;
  courts?: Court[];
  booking?: Booking;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
};

const BookingDialog = ({
  open,
  onOpenChange,
  scheduleId,
  date,
  startTime,
  courts = [],
  booking,
  onSuccess,
  onDelete,
}: BookingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    courtId: "",
    caseNumber: "",
    endTime: "",
  });

  useEffect(() => {
    if (booking) {
      setFormData({
        courtId: booking.display_court_id || "",
        caseNumber: booking.case_number,
        endTime: booking.end_time.substring(0, 5),
      });
    } else {
      setFormData({
        courtId: "",
        caseNumber: "",
        endTime: "",
      });
    }
  }, [booking]);

  const getEndTimeOptions = () => {
    if (!startTime) return [];
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const options: string[] = [];
    
    for (let hour = startHour; hour <= 16; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === startHour && minute <= startMinute) continue;
        if (hour === 16 && minute > 0) break;
        
        const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        options.push(time);
      }
    }
    
    return options;
  };

  const checkOverlap = async () => {
    if (!scheduleId || !date || !startTime || !formData.endTime) return false;

    const dateStr = format(date, "yyyy-MM-dd");
    const newStart = startTime + ":00";
    const newEnd = formData.endTime + ":00";
    const courtToCheck = formData.courtId || scheduleId;

    // Get all bookings for the same court on the same date
    const { data: existingBookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("date", dateStr)
      .or(`display_court_id.eq.${courtToCheck},display_court_id.is.null`)
      .or(`court_id.eq.${scheduleId}`);

    if (error) throw error;

    // Check for time overlap
    const hasOverlap = existingBookings?.some((booking) => {
      // Only check bookings for the same display court or those without a display court
      const bookingCourt = booking.display_court_id || booking.court_id;
      if (bookingCourt !== courtToCheck) return false;

      const existingStart = booking.start_time;
      const existingEnd = booking.end_time;

      // Check if times overlap: new start is before existing end AND new end is after existing start
      return newStart < existingEnd && newEnd > existingStart;
    });

    return hasOverlap;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId || !date || !startTime) return;

    setLoading(true);
    try {
      // Check for overlaps
      const hasOverlap = await checkOverlap();
      if (hasOverlap) {
        toast.error("This time slot overlaps with an existing booking");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("bookings").insert({
        court_id: scheduleId,
        display_court_id: formData.courtId || null,
        date: format(date, "yyyy-MM-dd"),
        start_time: startTime + ":00",
        end_time: formData.endTime + ":00",
        case_number: formData.caseNumber,
      });

      if (error) throw error;
      toast.success("Booking created successfully");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (booking) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>View booking information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Court Name</Label>
              <p className="font-medium">{booking.display_court?.name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(booking.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Time</Label>
              <p className="font-medium">
                {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Case Number</Label>
              <p className="font-medium">{booking.case_number}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this booking? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(booking.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Booking</DialogTitle>
            <DialogDescription>
              {date && startTime && `${format(date, "MMM d, yyyy")} at ${startTime}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="court">Court Name to Display *</Label>
              <Select value={formData.courtId} onValueChange={(value) => setFormData({ ...formData, courtId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a court" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name} - {court.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case Number *</Label>
              <Input
                id="caseNumber"
                value={formData.caseNumber}
                onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                placeholder="Enter case number"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  value={startTime || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {getEndTimeOptions().map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
