import coastLogo from "../assets/coast-capital-logotype_rgb_foamwhite.svg";
import coastSymbol from "../assets/coast-capital-symbol_rgb_foamwhite.svg";

function NavBar({ isAdmin }) {
  return (
    <header className="w-full">
      {/* White bar */}
      <div className="bg-white w-full py-1 px-4">
        <div className="flex justify-between items-center">
          {/* CCS link */}
          <a
            href="https://www.coastcapitalsavings.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 underline hover:text-gray-600"
          >
            coastcapitalsavings.com
          </a>

          <div className="flex gap-4">
            {/* Changelog Link */}
            <a
              href="/changelog"
              className="text-gray-600 underline hover:text-gray-600"
            >
              Changelog
            </a>

            {/* Contact Us Link */}
            <a
              href="https://www.coastcapitalsavings.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 underline hover:text-gray-600"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      {/* Blue/Red bar */}
      <div className={`${isAdmin ? 'bg-red-600' : 'bg-blue-600'} w-full py-4 px-6`}>
        <div className="flex items-center gap-4">
          <a href="/pageDashboard" className="flex items-center">
            <img
              alt="Coast Capital - Go to Home page"
              className="hidden md:block h-10"
              src={coastLogo}
            />
            <img
              alt="Coast Capital - Go to Home page"
              className="md:hidden h-8"
              src={coastSymbol}
            />
          </a>
          {/* ADMIN MODE text */}
          {isAdmin && (
            <span className="text-white font-bold uppercase text-sm tracking-wide">
              ADMINISTRATOR MODE
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default NavBar;