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
  is_active: boolean;
};

const Index = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCourts(data || []);
    } catch (error: any) {
      console.error("Error fetching courts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCourt) {
    // Create a schedule-like object for compatibility with WeeklyScheduler
    const scheduleData = {
      id: selectedCourt.id,
      court_id: selectedCourt.id,
      is_active: selectedCourt.is_active,
      courts: selectedCourt
    };

    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCourt(null)}
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
                    {selectedCourt.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourt.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <WeeklyScheduler schedule={scheduleData} />
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
        ) : courts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No active courts available at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => (
              <Card
                key={court.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedCourt(court)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start gap-2">
                    <Scale className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{court.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {court.location}
                  </CardDescription>
                </CardHeader>
                {court.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {court.description}
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
