import NavigationBar from "./components/NavigationBar";
import Header from "./components/Header";
import Attribution from "./components/Attribution";
import HeadingSubheading from "./components/HeadingSubheading";
import Services from "./components/Services";
import CTA from "./components/CTA";
import CaseStudies from "./components/CaseStudies";
import Process from "./components/Process";
import Team from "./components/Team";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

export default async function Home() {
  return (
    <div className="relative pt-[60px] max-sm:pt-[30px]">
      <NavigationBar />
      <Header className="mt-[70px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[100px] max-lg:mt-[80px] max-sm:mt-[60px]"
        heading="Features"
        subheading="Everything your business needs to manage bookings, customers, staff, schedules, reminders, and daily operations in one place."
      />
      <Services className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <CTA className="mt-[100px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]"
        heading="Built for Every Business"
        subheading="See how Slotova supports different industries with flexible booking, scheduling, customer management, and automated reminders."
      />
      <CaseStudies className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px] max-md:flex-col"
        heading="How Slotova Works"
        subheading="From setup to daily operations, Slotova makes booking management simple for any business."
        subheadingClassName="max-w-[473px]"
      />
      <Process className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]"
        heading="Project Team"
        subheading="Meet the developer and academic supervisor behind the development of Slotova."
        subheadingClassName="max-w-[600px]"
      />
      <Team className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[100px] max-lg:mt-[80px] max-sm:mt-[60px]"
        heading="Testimonials"
        subheading="Hear from Our Satisfied Clients: Read Our Testimonials to Learn More about Our Digital Marketing Services"
        subheadingClassName="max-w-[473px]"
      />
      <Testimonials className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <HeadingSubheading
        className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]"
        heading="Contact Us"
        subheading="Connect with Us: Let's Discuss Your Digital Marketing Needs"
        subheadingClassName="max-w-[323px]"
      />
      <Contact className="mt-[80px] max-lg:mt-[60px] max-sm:mt-[40px]" />
      <Footer className="mt-[140px] max-lg:mt-[100px] max-sm:mt-[60px]" />
      <Attribution />
      <ScrollToTop />
    </div>
  );
}
