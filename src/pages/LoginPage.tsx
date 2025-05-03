import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import owlLogo from "../assets/OWL-01.png";
import LoadingOverlay from "../components/LoadingOverlay";
import { useAuth } from "../hooks/AuthContext";

const LoginPage: React.FC = () => {
  const location = useLocation();
  const successMessage = location.state?.successMessage || "";
  const { login } = useAuth();

  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const formatUser = (user_info: any) => {
     const username = user_info.Username;

     let email = '';
     let firstName = '';
     let lastName = '';
     
     user_info.UserAttributes.forEach((attribute: { Name: string; Value: string }) => {
       if (attribute.Name === 'email') {
         email = attribute.Value;
       } else if (attribute.Name === 'given_name') {
         firstName = attribute.Value;
       } else if (attribute.Name === 'family_name') {
         lastName = attribute.Value;
       }
     });
     
     return {
       username,
       firstName,
       lastName,
       email
     };
  };
  
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    const payload = { email, password };

    try {
      const response = await fetch("https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Login response:", data);
      
      if (response.ok) {
        login(data.accessToken);

        const isAdmin = data.user_groups.some((group: {
            CreationDate: string,
            Description: string,
            GroupName: string,
            LastModifiedDate: string,
            UserPoolId: string,  
          }) => group.GroupName === "admin");

        const user = formatUser(data.user_info);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("isAdmin", JSON.stringify(isAdmin));

        navigate("/pageDashboard");
      } else {
        const data = await response.json();
        setErrorMessage(data?.message || "Login failed.");
      }
    } catch (error) {
      setErrorMessage("Login failed.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <LoadingOverlay loading={loading} />

      <NavBar />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-start p-8 text-center pt-20">
        <img src={owlLogo} alt="Owl" className="w-20 h-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">OWL Document Reader</h1>

        {/* Show success message from registration */}
        {successMessage && (
          <div className="mb-4 p-2 text-green-700 border border-green-700 rounded">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col w-72 mt-4 text-left">
          {/* Error Messages */}
          {errorMessage && (
            <div className="mb-4 p-2 text-red-700 border border-red-700 rounded">
              {errorMessage}
            </div>
          )}

          {/* Email */}
          <label htmlFor="email" className="mb-1 font-semibold">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-0 p-2 text-base 
                       border border-gray-300 
                       rounded 
                       focus:border-blue-600 
                       focus:outline-none 
                       focus:ring-2 focus:ring-blue-600"
          />

          {/* Password */}
          <label htmlFor="password" className="mb-1 font-semibold mt-4">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-8 p-2 text-base 
                       border border-gray-300 
                       rounded 
                       focus:border-blue-600 
                       focus:outline-none 
                       focus:ring-2 focus:ring-blue-600"
          />

          {/* Log In Button */}
          <button
            type="submit"
            className="mb-2 py-2 px-4 bg-blue-600 text-white font-bold rounded-full border 
                       border-black hover:border-black hover:bg-blue-800"
          >
            Log In
          </button>
          {/* Register Button */}
          <button
            type="button"
            className="mb-4 py-2 px-4 bg-white text-black border border-black font-semibold 
                       rounded-full hover:border-black hover:bg-gray-300"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;
