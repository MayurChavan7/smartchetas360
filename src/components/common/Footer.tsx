import {
  ArrowUpRight,
  Droplets,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Services", href: "/services" },
  { label: "Awards", href: "/awards" },
  { label: "Contact Us", href: "/contact-us" },
];

const expertise = [
  "Ultrasonic Flow Metering",
  "SCADA & Automation",
  "Smart Metering Solutions",
  "Water Audits & Consultancy",
];

// Add the official profile URLs when they are available.
// Until then, the social marks are displayed as non-clickable placeholders.
const socials = [
  { label: "Facebook", mark: "f", href: "" },
  { label: "Twitter / X", mark: "X", href: "" },
  { label: "LinkedIn", mark: "in", href: "" },
  { label: "Instagram", mark: "◎", href: "" },
];

const currentYear = new Date().getFullYear();

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0B1729] text-slate-300">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Top brand strip */}
        <div className="flex flex-col justify-between gap-5 border-b border-white/10 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
              <Droplets size={28} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-lg font-extrabold tracking-wide text-white">
                CHETAS
                <span className="ml-1 text-cyan-400">CONTROL</span>
              </h2>
              <p className="text-[10px] font-medium uppercase tracking-[0.19em] text-slate-400">
                Systems Private Limited
              </p>
            </div>
          </div>

          <div className="flex w-fit max-w-full flex-wrap items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs font-semibold tracking-wide text-cyan-300">
              SMART DAM 360
            </span>
            <span className="text-xs text-slate-500">
              · Intelligent Water Management
            </span>
          </div>
        </div>

        {/* Main footer columns */}
        <div className="grid grid-cols-1 gap-10 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Company information */}
          <div>
            <h3 className="mb-4 text-base font-bold text-white">
              About Chetas
            </h3>

            <p className="max-w-sm text-sm leading-7 text-slate-400">
              Established in 1989, Chetas Control Systems Pvt Ltd is a pioneer
              in ultrasonic flow metering, SCADA automation, smart metering,
              and water audits across India.
            </p>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Connect with us
              </p>

              <div className="flex items-center gap-2">
                {socials.map(({ label, mark, href }) => {
                  const socialMark = (
                    <span className="text-sm font-bold leading-none">
                      {mark}
                    </span>
                  );

                  return href ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-400 hover:text-[#0B1729]"
                    >
                      {socialMark}
                    </a>
                  ) : (
                    <span
                      key={label}
                      aria-label={`${label} URL not configured`}
                      title={`${label} URL not configured`}
                      className="flex h-10 w-10 cursor-default items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400"
                    >
                      {socialMark}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-5 text-base font-bold text-white">
              Quick Links
            </h3>

            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group flex w-fit items-center gap-2 text-sm text-slate-400 transition-colors hover:text-cyan-400"
                  >
                    <span className="h-1 w-1 rounded-full bg-slate-600 transition-all group-hover:bg-cyan-400 group-hover:ring-4 group-hover:ring-cyan-400/10" />
                    {item.label}
                    <ArrowUpRight
                      size={13}
                      className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Expertise */}
          <div>
            <h3 className="mb-5 text-base font-bold text-white">
              Our Expertise
            </h3>

            <ul className="space-y-4">
              {expertise.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-5 text-slate-400 transition-colors hover:text-cyan-300"
                >
                  <Droplets
                    size={15}
                    className="mt-0.5 shrink-0 text-cyan-500"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-5 text-base font-bold text-white">
              Contact Information
            </h3>

            <div className="space-y-5">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                  <MapPin size={17} />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Our Office
                  </p>

                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Chetas+House+Plot+No+1+Survey+No+8+9+Sutarwadi+Pashan+Pune+411021"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm leading-6 text-slate-400 transition-colors hover:text-white"
                  >
                    Chetas House, Plot No.1, Survey No.8+9,
                    <br />
                    Shree Siddhatek Society, Sutarwadi,
                    <br />
                    Pashan, Pune - 411021,
                    <br />
                    Maharashtra, India
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                  <Phone size={17} />
                </div>

                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Phone
                  </p>

                  <div className="space-y-1 text-sm text-slate-400">
                    <a
                      href="tel:02025871111"
                      className="block transition-colors hover:text-white"
                    >
                      020-25871111
                    </a>
                    <a
                      href="tel:02025870370"
                      className="block transition-colors hover:text-white"
                    >
                      020-25870370
                    </a>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                  <Mail size={17} />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Email
                  </p>

                  <a
                    href="mailto:info@chetascontrol.com"
                    className="break-all text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    info@chetascontrol.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs leading-5 text-slate-500">
            © {currentYear}{" "}
            <span className="font-semibold text-slate-300">
              Chetas Control Systems Pvt Ltd.
            </span>{" "}
            All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Powered by</span>
            <span className="font-semibold tracking-wide text-cyan-400">
              SMART DAM 360
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
