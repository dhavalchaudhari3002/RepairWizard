import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-6 text-center">PRIVACY POLICY</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">Last updated April 10, 2025</p>
      
      <ScrollArea className="h-[70vh] rounded-md border p-6 bg-card">
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. INFORMATION WE COLLECT</h2>
            <p className="mb-4">
              At ReuseHub, we collect personal information that you provide to us when registering on our platform, 
              including but not limited to your name, email address, and device information related to repairs.
            </p>
            <p className="mb-4">
              We may also collect information automatically when you use our Services, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Device information (including device model, operating system, and diagnostic data)</li>
              <li>Log and usage data</li>
              <li>Location data (with your permission)</li>
              <li>Cookies and tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. HOW WE USE YOUR INFORMATION</h2>
            <p className="mb-4">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Providing, operating, and maintaining our Services</li>
              <li>Improving, personalizing, and expanding our Services</li>
              <li>Understanding and analyzing how you use our Services</li>
              <li>Developing new products, services, features, and functionality</li>
              <li>Communicating with you about service-related notices and updates</li>
              <li>Protecting against, identifying, and preventing fraud and other illegal activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. SHARING YOUR INFORMATION</h2>
            <p className="mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Service providers who help us operate our platform</li>
              <li>Business partners with your consent</li>
              <li>Legal authorities when required by law or to protect our rights</li>
            </ul>
            <p className="mb-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. DATA STORAGE AND SECURITY</h2>
            <p className="mb-4">
              We use Google Cloud Storage and other secure data storage solutions to store your information.
              We implement appropriate technical and organizational measures to protect your personal data
              against unauthorized or unlawful processing, accidental loss, destruction, or damage.
            </p>
            <p className="mb-4">
              While we strive to use commercially acceptable means to protect your personal data,
              we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. YOUR DATA RIGHTS</h2>
            <p className="mb-4">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>The right to access your personal data</li>
              <li>The right to rectification of inaccurate data</li>
              <li>The right to erasure of your data (the "right to be forgotten")</li>
              <li>The right to restrict processing of your data</li>
              <li>The right to data portability</li>
              <li>The right to object to how your data is processed</li>
            </ul>
            <p className="mb-4">
              To exercise any of these rights, please contact us at reusehubteam@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. COOKIES POLICY</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to track activity on our Services and store certain information.
              Cookies are files with a small amount of data that may include an anonymous unique identifier.
            </p>
            <p className="mb-4">
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              However, if you do not accept cookies, you may not be able to use some portions of our Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. CHANGES TO THIS PRIVACY POLICY</h2>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting
              the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
            <p className="mb-4">
              You are advised to review this Privacy Policy periodically for any changes. Changes to this
              Privacy Policy are effective when they are posted on this page.
            </p>
          </section>

          <p className="mt-10 text-center">
            For any questions or concerns about your privacy, please contact us at:
            <a href="mailto:reusehubteam@gmail.com" className="text-primary font-semibold ml-1">
              reusehubteam@gmail.com
            </a>
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}