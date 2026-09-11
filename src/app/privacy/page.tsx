import { Header } from "@/components/layout/header";

export const metadata = {
  title: "Privacy Policy - FORM",
  description: "Privacy Policy for FORM Website-to-product studio",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-semibold text-ink mb-8">Privacy Policy</h1>
        <div className="prose prose-ink max-w-none">
          <p className="text-text-secondary mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">Information We Collect</h2>
          <p className="text-text-secondary mb-4">We collect information you provide directly to us, such as when you create an account, submit a website for analysis, or contact us for support.</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">How We Use Your Information</h2>
          <p className="text-text-secondary mb-4">We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">Data Sharing</h2>
          <p className="text-text-secondary mb-4">We do not sell your personal information. We may share your information with service providers who perform services on our behalf.</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">Security</h2>
          <p className="text-text-secondary mb-4">We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">Your Rights</h2>
          <p className="text-text-secondary mb-4">You have the right to access, correct, or delete your personal information. You may also object to or restrict processing of your data.</p>
          
          <h2 className="text-2xl font-semibold text-ink mt-10 mb-4">Contact Us</h2>
          <p className="text-text-secondary mb-4">If you have any questions about this Privacy Policy, please contact us at privacy@form.example.com.</p>
        </div>
      </main>
    </div>
  );
}