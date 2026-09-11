import Link from "next/link";
import { FORMMark } from "@/lib/brand/mark";

export function Header() {
  return (
    <header className="flex h-18 px-10 items-center justify-between border-b border-line-dark/50 bg-ink">
      <div className="flex items-center space-x-3">
        <FORMMark className="h-5 w-5 text-text-inverse" />
        <span className="whitespace-nowrap font-mono text-text-inverse">
          FORM
        </span>
      </div>
      <nav className="hidden md:flex space-x-6 text-text-inverse">
        <Link href="#product" className="hover:text-accent">
          Product
        </Link>
        <Link href="#features" className="hover:text-accent">
          How it works
        </Link>
        <Link href="#pricing" className="hover:text-accent">
          Pricing
        </Link>
      </nav>
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="text-sm font-medium text-text-inverse hover:text-accent"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="whitespace-nowrap rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          Start building
        </Link>
      </div>
    </header>
  );
}