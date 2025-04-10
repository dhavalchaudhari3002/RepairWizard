import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-6 text-center">TERMS OF SERVICE</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">Last updated April 10, 2025</p>
      
      <ScrollArea className="h-[70vh] rounded-md border p-6 bg-card">
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. AGREEMENT TO TERMS</h2>
            <p className="mb-4">
              We are ReuseHub ("Company," "we," "us," "our"), a company registered in Canada.
            </p>
            <p className="mb-4">
              We operate the website <a href="https://www.reusehub.org/" target="_blank" className="text-primary hover:underline">https://www.reusehub.org/</a> (the "Site"), 
              as well as any other related products and services that refer or link to these legal terms (the "Legal Terms")
              (collectively, the "Services").
            </p>
            <p className="mb-4">
              You can contact us by email at <a href="mailto:reusehubteam@gmail.com" className="text-primary hover:underline">reusehubteam@gmail.com</a>.
            </p>
            <p className="mb-4">
              These Legal Terms constitute a legally binding agreement made between you, whether
              personally or on behalf of an entity ("you"), and ReuseHub, concerning your access to and
              use of the Services. You agree that by accessing the Services, you have read, understood,
              and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE
              LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST
              DISCONTINUE USE IMMEDIATELY.
            </p>
            <p className="mb-4">
              We will provide you with prior notice of any scheduled changes to the Services you are
              using. Changes to Legal Terms will become effective right after posted on ReuseHub, and
              user will be informed through app notification.
            </p>
            <p className="mb-4">
              The Services are intended for users who are at least 18 years old. Persons under the age
              of 18 are not permitted to use or register for the Services.
            </p>
            <p className="mb-4">
              We recommend that you print a copy of these Legal Terms for your records.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. INTELLECTUAL PROPERTY RIGHTS</h2>
            <p className="mb-4">
              We are the owner or the licensee of all intellectual property rights in our Services, including
              all source code, databases, functionality, software, website designs, audio, video, text,
              photographs, and graphics in the Services (collectively, the "Content"), as well as the
              trademarks, service marks, and logos contained therein (the "Marks").
            </p>
            <p className="mb-4">
              Our Content and Marks are protected by copyright and trademark laws (and various other
              intellectual property rights and unfair competition laws) and treaties in the United States
              and around the world.
            </p>
            <p className="mb-4">
              The Content and Marks are provided in or through the Services "AS IS" for your personal,
              non-commercial use or internal business purpose only.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Your use of our Services</h3>
            <p className="mb-4">
              Subject to your compliance with these Legal Terms, including the "PROHIBITED ACTIVITIES"
              section below, we grant you a non-exclusive, non-transferable, revocable license to access
              the Services and to download or print a copy of any portion of the Content to which you have
              properly gained access solely for your personal, non-commercial use or internal business purpose.
            </p>
            <p className="mb-4">
              Except as set out in this section or elsewhere in our Legal Terms, no part of the Services
              and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted,
              publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise
              exploited for any commercial purpose whatsoever, without our express prior written permission.
            </p>
            <p className="mb-4">
              If you wish to make any use of the Services, Content, or Marks other than as set out in this
              section or elsewhere in our Legal Terms, please address your request to: <a href="mailto:reusehubteam@gmail.com" className="text-primary hover:underline">reusehubteam@gmail.com</a>.
              If we ever grant you the permission to post, reproduce, or publicly display any part of our
              Services or Content, you must identify us as the owners or licensors of the Services, Content,
              or Marks and ensure that any copyright or proprietary notice appears or is visible on posting,
              reproducing, or displaying our Content.
            </p>
            <p className="mb-4">
              We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.
            </p>
            <p className="mb-4">
              Any breach of these Intellectual Property Rights will constitute a material breach of our Legal
              Terms and your right to use our Services will terminate immediately.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Your submissions and contributions</h3>
            <p className="mb-4">
              Please review this section and the "PROHIBITED ACTIVITIES" section carefully prior to using
              our Services to understand the (a) rights you give us and (b) obligations you have when you
              post or upload any content through the Services.
            </p>
            <p className="mb-4">
              By using the Services, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>All registration information you submit will be true, accurate, current, and complete;</li>
              <li>You will maintain the accuracy of such information and promptly update such registration information as necessary;</li>
              <li>You have the legal capacity and you agree to comply with these Legal Terms;</li>
              <li>You are not a minor in the jurisdiction in which you reside;</li>
              <li>You will not access the Services through automated or non-human means, whether through a bot, script or otherwise;</li>
              <li>You will not use the Services for any illegal or unauthorized purpose;</li>
              <li>Your use of the Services will not violate any applicable law or regulation.</li>
            </ul>
            <p className="mb-4">
              If you provide any information that is untrue, inaccurate, not current, or incomplete, we have
              the right to suspend or terminate your account and refuse any and all current or future use of
              the Services (or any portion thereof).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. USER REGISTRATION</h2>
            <p className="mb-4">
              You may be required to register to use the Services. You agree to keep your password
              confidential and will be responsible for all use of your account and password. We reserve
              the right to remove, reclaim, or change a username you select if we determine, in our sole
              discretion, that such username is inappropriate, obscene, or otherwise objectionable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. SUBSCRIPTIONS</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Billing and Renewal</h3>
            <p className="mb-4">
              Your subscription will continue and automatically renew unless canceled. You consent to our
              charging your payment method on a recurring basis without requiring your prior approval for
              each recurring charge, until such time as you cancel the applicable order. The length of your
              billing cycle will be implemented in the future.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Free Trial</h3>
            <p className="mb-4">
              We offer a free trial to new users who register with the Services. The account will not be
              charged and the subscription will be suspended until upgraded to a paid version at the end
              of the free trial.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Cancellation</h3>
            <p className="mb-4">
              You can cancel your subscription at any time by logging into your account. Your cancellation
              will take effect at the end of the current paid term. If you have any questions or are
              unsatisfied with our Services, please email us at <a href="mailto:reusehubteam@gmail.com" className="text-primary hover:underline">reusehubteam@gmail.com</a>.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Fee Changes</h3>
            <p className="mb-4">
              We may, from time to time, make changes to the subscription fee and will communicate any
              price changes to you in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. PROHIBITED ACTIVITIES</h2>
            <p className="mb-4">
              You may not access or use the Services for any purpose other than that for which we make
              the Services available. The Services may not be used in connection with any commercial
              endeavors except those that are specifically endorsed or approved by us.
            </p>
            <p className="mb-4">
              As a user of the Services, you agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
              <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
              <li>Circumvent, disable, or otherwise interfere with security-related features of the Services, including features that prevent or restrict the use or copying of any Content or enforce limitations on the use of the Services and/or the Content contained therein.</li>
              <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
              <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
              <li>Engage in unauthorized framing of or linking to the Services.</li>
              <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material, including excessive use of capital letters and spamming that interferes with any party's uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.</li>
              <li>Delete the copyright or other proprietary rights notice from any Content.</li>
              <li>Attempt to impersonate another user or person or use the username of another user.</li>
              <li>Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism, including without limitation, clear graphics interchange formats ("gifs"), 1×1 pixels, web bugs, cookies, or other similar devices (sometimes referred to as "spyware" or "passive collection mechanisms" or "pcms").</li>
              <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.</li>
              <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
              <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.</li>
            </ul>
          </section>

          <p className="mt-10 text-center">
            For any questions or concerns about these Terms, please contact us at:
            <a href="mailto:reusehubteam@gmail.com" className="text-primary font-semibold ml-1">
              reusehubteam@gmail.com
            </a>
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}