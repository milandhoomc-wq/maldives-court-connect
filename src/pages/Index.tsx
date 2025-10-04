import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, MapPin, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import WeeklyScheduler from "@/components/WeeklyScheduler";

type Court = {
  id: string;
  name: string;
  location: string;
  description: string | null;
};

type CourtSchedule = {
  id: string;
  court_id: string;
  is_active: boolean;
  courts: Court;
};

const Index = () => {
  const [schedules, setSchedules] = useState<CourtSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<CourtSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("court_schedules")
        .select("*, courts(*)")
        .eq("is_active", true)
        .order("courts(name)");

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedSchedule) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSchedule(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Courts
              </Button>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary p-2">
                  <Scale className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {selectedSchedule.courts.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedSchedule.courts.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <WeeklyScheduler schedule={selectedSchedule} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary p-3">
                <Scale className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Court Scheduler</h1>
            </div>
            <Link to="/auth">
              <Button variant="outline">Admin Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Select a Court</h2>
          <p className="text-muted-foreground">Choose a court to view its schedule</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No active court schedules available at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedSchedule(schedule)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start gap-2">
                    <Scale className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{schedule.courts.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {schedule.courts.location}
                  </CardDescription>
                </CardHeader>
                {schedule.courts.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {schedule.courts.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
