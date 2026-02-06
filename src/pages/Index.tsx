import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  Calendar,
  CheckCircle,
  ArrowRight,
  Briefcase,
  FileText,
  Shield,
  TrendingUp,
  Brain,
  Cpu,
  Coffee,
  Layers,
  Building2,
  Mail,
  MapPin
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

// Statistics with animated counters
const statistics = [
  {
    icon: Users,
    value: 207,
    label: "Total Interns",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Brain,
    value: 86,
    label: "AI-ML Interns",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Coffee,
    value: 48,
    label: "JAVA Interns",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Layers,
    value: 40,
    label: "MERN Interns",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Cpu,
    value: 33,
    label: "VLSI Interns",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

// Internship-related images that will rotate
const heroImages = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=1080&fit=crop&q=80", // Team collaboration
  "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1920&h=1080&fit=crop&q=80", // Professional working
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&h=1080&fit=crop&q=80", // Team meeting
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1920&h=1080&fit=crop&q=80", // Office collaboration
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1920&h=1080&fit=crop&q=80", // Team working together
];

export default function Index() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [counters, setCounters] = useState(statistics.map(() => 0));
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Animated counter effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          statistics.forEach((stat, index) => {
            let current = 0;
            const increment = stat.value / 50; // 50 steps for smooth animation
            const timer = setInterval(() => {
              current += increment;
              if (current >= stat.value) {
                setCounters((prev) => {
                  const newCounters = [...prev];
                  newCounters[index] = stat.value;
                  return newCounters;
                });
                clearInterval(timer);
              } else {
                setCounters((prev) => {
                  const newCounters = [...prev];
                  newCounters[index] = Math.floor(current);
                  return newCounters;
                });
              }
            }, 30);
          });
        }
      },
      { threshold: 0.3 }
    );

    const statsSection = document.getElementById('statistics-section');
    if (statsSection) {
      observer.observe(statsSection);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/favicon.ico"
              alt="FESTIVA Logo"
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="text-xl font-bold">FESTIVA Interns</span>
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
      <section className="relative overflow-hidden pt-16 min-h-screen flex items-center">
        {/* Rotating Background Images */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`Internship scene ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentImageIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>

        {/* Text content overlay */}
        <div className="container relative z-10 py-20 md:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white opacity-0 animate-fade-in">
              <Briefcase className="h-4 w-4" />
              <span>Professional Internship Management</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white opacity-0 animate-slide-up md:text-5xl lg:text-6xl" style={{ animationDelay: '0.1s' }}>
              Streamline Your{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Internship Journey
              </span>
            </h1>

            <p className="mb-8 text-lg text-white/90 opacity-0 animate-slide-up md:text-xl" style={{ animationDelay: '0.2s' }}>
              A complete platform to track your internship progress, manage projects,
              and communicate with faculty. Built for interns, designed for success.
            </p>

            <div className="flex flex-col items-start gap-4 opacity-0 animate-slide-up sm:flex-row" style={{ animationDelay: '0.3s' }}>
              <Button size="xl" variant="hero" asChild>
                <Link to="/auth?mode=register">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                <Link to="/auth?mode=login">Already have an account?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="statistics-section" className="border-t bg-background py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Our Growing Community</h2>
            <p className="text-muted-foreground">Join our diverse team of talented interns</p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {statistics.map((stat, index) => (
              <Card
                key={stat.label}
                className="group relative overflow-hidden border-0 bg-card shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${stat.bgColor} transition-transform group-hover:scale-110`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className={`mb-2 text-4xl font-bold ${stat.color}`}>
                    {counters[index]}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-1 w-full ${stat.bgColor} transition-transform origin-left scale-x-0 group-hover:scale-x-100`} />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Parent Organization */}
      <section className="relative min-h-screen flex items-center border-t bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="container relative z-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-12 text-center opacity-0 animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 backdrop-blur-sm px-6 py-2.5 shadow-lg">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">About Parent Organization</span>
              </div>
              <h2 className="mb-4 text-4xl font-bold md:text-5xl lg:text-6xl opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Festiva Moments
              </h2>
              <p className="text-xl font-medium text-primary md:text-2xl opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                India's First AI-Enabled Event Planning Platform
              </p>
            </div>

            {/* Content Card */}
            <Card className="overflow-hidden border-0 shadow-2xl backdrop-blur-sm bg-card/95 opacity-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-8 md:p-12">
                <div className="mb-8">
                  <p className="text-lg md:text-xl leading-relaxed text-muted-foreground text-justify">
                    Festiva Moments is India's first AI-enabled event planning platform that connects customers and vendors seamlessly.
                    Acting as a smart bridge between both, Festiva simplifies event planning — from booking photographers and decorators
                    to managing venues, catering, and entertainment — all in one place.
                  </p>
                </div>

                {/* Decorative divider */}
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </div>

                {/* Visual highlights */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                  <div className="text-center p-6 rounded-xl bg-primary/5 border border-primary/10 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="text-3xl font-bold text-primary mb-2">AI-Enabled</div>
                    <div className="text-sm text-muted-foreground">Smart Technology</div>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-accent/5 border border-accent/10 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="text-3xl font-bold text-accent mb-2">Seamless</div>
                    <div className="text-sm text-muted-foreground">Easy Connection</div>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-success/5 border border-success/10 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="text-3xl font-bold text-success mb-2">All-in-One</div>
                    <div className="text-sm text-muted-foreground">Complete Solution</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                Why Choose <span className="text-primary">FESTIVA Interns</span>?
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
      <footer className="border-t bg-muted/30 py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <img
                  src="/favicon.ico"
                  alt="FESTIVA Logo"
                  className="h-8 w-8 rounded-lg object-contain"
                />
                <span className="font-semibold">FESTIVA Interns</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional internship management platform for students.
              </p>
            </div>

            {/* Registered Address */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Registered Address</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                28/2, 21st cross, Vinayaka Nagar,<br />
                K R Puram, Bengalore - 560036
              </p>
            </div>

            {/* Corporate Office */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-sm">Corporate Office</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jai Bhuvaneshwari Layout road,<br />
                Opposite to Cambridge College,<br />
                K R Puram, Bengalore - 560036
              </p>
            </div>

            {/* Contact */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Contact Us</h3>
              </div>
              <a
                href="mailto:support@festivamoments.co.in"
                className="text-sm text-primary hover:underline transition-colors"
              >
                support@festivamoments.co.in
              </a>
              <div className="mt-4 flex gap-4 text-sm">
                <a href="#statistics-section" className="text-muted-foreground hover:text-primary transition-colors">
                  Statistics
                </a>
                <a href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Festiva Moments Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}