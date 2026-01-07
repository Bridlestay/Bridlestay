import { Header } from "@/components/header";

export default function CompanyPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-serif text-4xl font-bold mb-8">Company Details</h1>
        
        <div className="prose prose-lg">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Registered Company Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold">Company Name:</dt>
                <dd>Cantra Limited</dd>
              </div>
              <div>
                <dt className="font-semibold">Registered Office:</dt>
                <dd>
                  123 Equestrian Way<br />
                  Worcester<br />
                  Worcestershire<br />
                  WR1 1AA<br />
                  United Kingdom
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Company Registration Number:</dt>
                <dd>12345678</dd>
              </div>
              <div>
                <dt className="font-semibold">VAT Number:</dt>
                <dd>GB 123 4567 89</dd>
              </div>
            </dl>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold">Email:</dt>
                <dd>info@cantra.app</dd>
              </div>
              <div>
                <dt className="font-semibold">Support:</dt>
                <dd>support@cantra.app</dd>
              </div>
              <div>
                <dt className="font-semibold">Phone:</dt>
                <dd>+44 (0) 1234 567 890</dd>
              </div>
            </dl>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">About Cantra</h2>
            <p>
              Cantra is the UK&apos;s complete horse app - stays, routes, and community. We connect horse owners
              with verified hosts who offer specialized equestrian facilities. We are committed to providing
              safe, high-quality accommodations for both horses and riders throughout the UK.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}



