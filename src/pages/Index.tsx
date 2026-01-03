import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Calendar, 
  CheckCircle, 
  ArrowRight,
  Briefcase,
  FileText,
  Shield
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Internship Diary",
    description: "Track your daily work, hours, and learnings with our structured diary system.",
  },
  {
    icon: Users,
    title: "Team Projects",
    description: "Collaborate with teammates on projects and maintain shared progress logs.",
  },
  {
    icon: Calendar,
    title: "Leave Management",
    description: "Request and track leaves with easy approval workflows.",
  },
  {
    icon: Shield,
    title: "Faculty Oversight",
    description: "Faculty can monitor progress and provide guidance throughout your internship.",
  },
];

const benefits = [
  "Auto-generated Student IDs",
  "Weekly progress tracking",
  "Project collaboration tools",
  "Direct admin communication",
  "Mobile-friendly interface",
  "Secure data management",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FEST Interns</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="transition-smooth hover:scale-105">
              <Link to="/auth?mode=login">Login</Link>
            </Button>
            <Button asChild className="transition-smooth hover:scale-105">
              <Link to="/auth?mode=register">Register</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute -right-40 -top-40 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-40 top-40 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        
        <div className="container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm opacity-0 animate-fade-in">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Professional Internship Management</span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight opacity-0 animate-slide-up md:text-5xl lg:text-6xl" style={{ animationDelay: '0.1s' }}>
              Streamline Your{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Internship Journey
              </span>
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground opacity-0 animate-slide-up md:text-xl" style={{ animationDelay: '0.2s' }}>
              A complete platform to track your internship progress, manage projects, 
              and communicate with faculty. Built for students, designed for success.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 opacity-0 animate-slide-up sm:flex-row" style={{ animationDelay: '0.3s' }}>
              <Button size="xl" variant="hero" asChild>
                <Link to="/auth?mode=register">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/auth?mode=login">Already have an account?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Everything You Need</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Comprehensive tools to make your internship experience organized and productive.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group border-0 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg opacity-0 animate-slide-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                Why Choose <span className="text-primary">FEST Interns</span>?
              </h2>
              <p className="mb-8 text-muted-foreground">
                Our platform is designed specifically for internship management, 
                providing all the tools you need to succeed in your professional journey.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <div 
                    key={benefit} 
                    className="flex items-center gap-3 opacity-0 animate-slide-up"
                    style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
              <Card className="overflow-hidden border-0 shadow-elevated">
                <CardContent className="p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                      <FileText className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Student ID</p>
                      <p className="text-2xl font-bold text-primary">FEST0125001</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        Approved
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Diary Entries</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-sm text-muted-foreground">Projects</span>
                      <span className="font-semibold">2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary/5 to-accent/5 py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Join hundreds of students who are already managing their internships efficiently.
          </p>
          <Button size="xl" variant="hero" asChild>
            <Link to="/auth?mode=register">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">FEST Interns</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FEST Internship Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
