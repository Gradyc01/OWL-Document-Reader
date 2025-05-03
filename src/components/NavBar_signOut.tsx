import { useNavigate } from "react-router-dom";
import coastLogo from "../assets/coast-capital-logotype_rgb_foamwhite.svg";
import coastSymbol from "../assets/coast-capital-symbol_rgb_foamwhite.svg";

function NavBar_signOut({ isAdmin }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    navigate("/");
  };

  return (
    <header className="w-full">
      {/* White Bar */}
      <div className="bg-white w-full py-1 px-4">
        <div className="flex justify-between items-center">
          <a
            href="https://www.coastcapitalsavings.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 underline hover:text-gray-600"
          >
            coastcapitalsavings.com
          </a>

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

      {/* Blue/Red Bar with Logo & Sign Out Button */}
      <div className={`${isAdmin ? 'bg-red-600' : 'bg-blue-600'} w-full py-4 px-6 flex justify-between items-center`}>
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

        <button
          onClick={handleSignOut}
          className="border border-white bg-white text-blue-600 font-bold py-2 px-4 rounded-full transition 
                     hover:bg-blue-600 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

export default NavBar_signOut;