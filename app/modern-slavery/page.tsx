import { Header } from "@/components/header";

export default function ModernSlaveryPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-serif text-4xl font-bold mb-8">
          Modern Slavery Act Statement
        </h1>
        
        <div className="prose prose-lg">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p>
              This statement is made pursuant to section 54(1) of the Modern Slavery Act 2015 and constitutes
              BridleStay&apos;s slavery and human trafficking statement for the financial year ending 2024.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Our Business</h2>
            <p>
              BridleStay operates an online marketplace connecting equestrian property hosts with guests
              throughout the United Kingdom.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
            <p>
              We are committed to ensuring that there is no modern slavery or human trafficking in our supply
              chains or in any part of our business. We have zero tolerance for modern slavery.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Due Diligence</h2>
            <p>
              As part of our initiative to identify and mitigate risk, we:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Conduct thorough screening of all business partners and suppliers</li>
              <li>Maintain a whistleblowing policy for reporting concerns</li>
              <li>Provide training to our staff on modern slavery awareness</li>
              <li>Regularly review and update our policies and procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Reporting Concerns</h2>
            <p>
              If you have any concerns about modern slavery in our business or supply chains, please contact
              us at compliance@bridlestay.com
            </p>
          </section>
        </div>
      </main>
    </>
  );
}



