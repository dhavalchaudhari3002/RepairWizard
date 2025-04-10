import { Link } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-muted/40 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {currentYear} ReuseHub. All rights reserved.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0">
            <nav className="flex space-x-4">
              <Link href="/terms-of-service">
                <a className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}