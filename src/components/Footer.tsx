import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue-600 text-white p-8 flex flex-wrap justify-around">
      <div className="max-w-[200px] m-2">
        <h3 className="mb-2 text-lg font-bold">Help & Support</h3>
        <ul className="list-none space-y-1">
          <li>Online Banking Support</li>
          <li>Business Digital Banking Support</li>
          <li>Online Security</li>
          <li>Lost or Stolen Cards</li>
        </ul>
      </div>

      <div className="max-w-[200px] m-2">
        <h3 className="mb-2 text-lg font-bold">Careers</h3>
        <ul className="list-none space-y-1">
          <li>What We Offer You</li>
          <li>Job Opportunities</li>
        </ul>
      </div>

      <div className="max-w-[200px] m-2">
        <h3 className="mb-2 text-lg font-bold">Legal</h3>
        <ul className="list-none space-y-1">
          <li>Privacy</li>
          <li>Service Fees</li>
          <li>Governance</li>
        </ul>
      </div>

      <div className="max-w-[200px] m-2">
        <h3 className="mb-2 text-lg font-bold">About Us</h3>
        <ul className="list-none space-y-1">
          <li>Social Purpose</li>
          <li>BC Insights</li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;