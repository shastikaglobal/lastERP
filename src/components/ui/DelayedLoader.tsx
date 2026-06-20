import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const DelayedLoader = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
      </div>
    </div>
  );
};

export default DelayedLoader;
