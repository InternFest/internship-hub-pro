import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center fade-in">
        <h1 className="mb-4 text-6xl font-bold text-primary bounce-in">404</h1>
        <p className="mb-4 text-xl text-muted-foreground slide-up">Oops! Page not found</p>
        <a 
          href="/" 
          className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground transition-smooth hover:scale-105 active:scale-95"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
