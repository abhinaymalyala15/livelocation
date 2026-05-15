import { Link } from "react-router-dom";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Map className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-5xl font-semibold text-muted-foreground/30 tabular-nums">404</p>
          <h1 className="text-xl font-semibold text-foreground mt-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-1">The page you requested does not exist.</p>
        </div>
        <Button asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
