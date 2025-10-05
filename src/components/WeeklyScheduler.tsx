import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parse } from "date-fns";
import BookingDialog from "./BookingDialog";
import { toast } from "sonner";

type Court = {
  id: string;
  name: string;
  location: string;
};

type CourtSchedule = {
  id: string;
  court_id: string;
  courts: Court;
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

type Holiday = {
  id: string;
  name: string;
  date: string;
};

type TimeSlot = {
  time: string;
  hour: number;
  minute: number;
};

const WeeklyScheduler = ({ schedule }: { schedule: CourtSchedule }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const timeSlots: TimeSlot[] = [];
  for (let hour = 9; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 16 && minute > 0) break;
      timeSlots.push({
        time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        hour,
        minute,
      });
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    fetchData();
  }, [currentWeekStart, schedule.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

      const [bookingsRes, holidaysRes, courtsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, display_court:display_court_id(id, name, location)")
          .eq("court_id", schedule.id)
          .gte("date", format(currentWeekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd")),
        supabase
          .from("holidays")
          .select("*")
          .gte("date", format(currentWeekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd")),
        supabase.from("courts").select("id, name, location").order("name"),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (holidaysRes.error) throw holidaysRes.error;
      if (courtsRes.error) throw courtsRes.error;

      setBookings(bookingsRes.data || []);
      setHolidays(holidaysRes.data || []);
      setCourts(courtsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 5 || day === 6; // Friday or Saturday
  };

  const isHoliday = (date: Date) => {
    return holidays.some((h) => isSameDay(new Date(h.date), date));
  };

  const getHolidaysForDate = (date: Date) => {
    return holidays.filter((h) => isSameDay(new Date(h.date), date));
  };

  const getBookingForSlot = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.find((b) => {
      if (b.date !== dateStr) return false;
      const slotTime = parse(time, "HH:mm", new Date());
      const startTime = parse(b.start_time, "HH:mm:ss", new Date());
      const endTime = parse(b.end_time, "HH:mm:ss", new Date());
      return slotTime >= startTime && slotTime < endTime;
    });
  };

  const getCourtColorClasses = (courtId: string) => {
    const index = courts.findIndex((c) => c.id === courtId);
    const colorMap = {
      "court-1": "bg-court-1 text-court-1-foreground",
      "court-2": "bg-court-2 text-court-2-foreground",
      "court-3": "bg-court-3 text-court-3-foreground",
      "court-4": "bg-court-4 text-court-4-foreground",
      "court-5": "bg-court-5 text-court-5-foreground",
      "court-6": "bg-court-6 text-court-6-foreground",
    };
    
    if (courtId === schedule.court_id) return "bg-accent text-accent-foreground";
    
    const colors = ["court-1", "court-2", "court-3", "court-4", "court-5", "court-6"];
    const colorKey = colors[index % colors.length];
    return colorMap[colorKey as keyof typeof colorMap];
  };

  const handleSlotClick = (date: Date, time: string) => {
    if (isWeekend(date) || isHoliday(date)) return;
    const booking = getBookingForSlot(date, time);
    if (booking) {
      setSelectedBooking(booking);
    } else {
      setSelectedSlot({ date, time });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
      if (error) throw error;
      toast.success("Booking deleted successfully");
      setSelectedBooking(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <h2 className="text-2xl font-bold">
          {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "MMM d, yyyy")}
        </h2>
        <Button
          variant="outline"
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayHolidays = getHolidaysForDate(day);
            const isHol = isWeekend(day) || dayHolidays.length > 0;
            const dayBookings = bookings.filter((b) => b.date === format(day, "yyyy-MM-dd"));

            return (
              <Card key={day.toISOString()} className={`overflow-hidden ${isHol ? "opacity-60" : ""}`}>
                <div className={`p-4 border-b ${isHol ? "bg-holiday-light" : "bg-muted/50"}`}>
                  <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide">{format(day, "EEE")}</div>
                    <div className="text-2xl font-bold mt-1">{format(day, "d")}</div>
                    <div className="text-xs text-muted-foreground">{format(day, "MMM")}</div>
                  </div>
                  {dayHolidays.map((h) => (
                    <div key={h.id} className="text-xs text-holiday font-medium text-center mt-2 px-2 py-1 bg-background/50 rounded">
                      {h.name}
                    </div>
                  ))}
                </div>

                <CardContent className="p-3 space-y-2 min-h-[400px]">
                  {isHol ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {isWeekend(day) ? "Weekend" : "Holiday"}
                    </div>
                  ) : dayBookings.length > 0 ? (
                    dayBookings.map((booking) => {
                      const colorClasses = getCourtColorClasses(booking.display_court_id || schedule.court_id);
                      const courtName = booking.display_court?.name || schedule.courts.name;
                      
                      return (
                        <div
                          key={booking.id}
                          className={`${colorClasses} p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105`}
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <div className="text-xs font-bold mb-1">{courtName}</div>
                          <div className="text-sm font-semibold mb-1 line-clamp-2">{booking.case_number}</div>
                          <div className="text-xs opacity-90 font-medium">
                            {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => handleSlotClick(day, "09:00")}
                      className="w-full py-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                    >
                      <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        Click to add booking
                      </div>
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedSlot && (
        <BookingDialog
          open={!!selectedSlot}
          onOpenChange={(open) => !open && setSelectedSlot(null)}
          scheduleId={schedule.id}
          date={selectedSlot.date}
          startTime={selectedSlot.time}
          courts={courts}
          onSuccess={() => {
            setSelectedSlot(null);
            fetchData();
          }}
        />
      )}

      {selectedBooking && (
        <BookingDialog
          open={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
          booking={selectedBooking}
          onDelete={handleDeleteBooking}
        />
      )}
    </div>
  );
};

export default WeeklyScheduler;
