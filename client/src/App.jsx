import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { queryClient } from "./lib/queryClient.js";
import { Toaster } from "./components/ui/toaster.jsx";
import { TooltipProvider } from "./components/ui/tooltip.jsx";
import ChatPage from "./pages/chat.jsx";
import AuthPage from "./pages/auth.jsx";
import SettingsPage from "./pages/settings.jsx";
import { useAuth } from "./hooks/useAuth.js";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {user ? (
        <>
          <Route path="/" component={ChatPage} />
          <Route path="/settings" component={SettingsPage} />
        </>
      ) : (
        <Route path="/" component={AuthPage} />
      )}
      <Route component={() => <div className="min-h-screen flex items-center justify-center bg-background text-foreground">404 - Page Not Found</div>} />
    </Switch>
  );
}

function App() {
  // Force dark mode for X.com theme
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
