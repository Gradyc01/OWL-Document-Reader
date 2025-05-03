import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import LoadingOverlay from "../components/LoadingOverlay";
import { REGISTER_URL } from "../globals";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[@$!%*?&#])(?=.*\d).{8,}$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [firstNameError, setFirstNameError] = useState<string>("");
  const [lastNameError, setLastNameError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");

  const [formError, setFormError] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const validateFirstName = (value: string) => {
    if (!value) {
      setFirstNameError("First name is required.");
    } else {
      setFirstNameError("");
    }
  };

  const validateLastName = (value: string) => {
    if (!value) {
      setLastNameError("Last name is required.");
    } else {
      setLastNameError("");
    }
  };

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("Email is required.");
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setEmailError("Email format is invalid.");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required.");
    } else if (!PASSWORD_REGEX.test(value)) {
      setPasswordError(
        "Must be 8+ chars, include uppercase, a number, and a special character."
      );
    } else {
      setPasswordError("");
    }
  };

  const validateConfirmPassword = (value: string, pwd: string) => {
    if (!value) {
      setConfirmPasswordError("Please confirm your password.");
    } else if (value !== pwd) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);

    validateFirstName(firstName);
    validateLastName(lastName);
    validateEmail(email);
    validatePassword(password);
    validateConfirmPassword(confirmPassword, password);

    if (
      firstNameError ||
      lastNameError ||
      emailError ||
      passwordError ||
      confirmPasswordError
    ) {
      setFormError("Please fix the errors above.");
      setLoading(false);
      return;
    }

    const payload = { firstName, lastName, email, password };
    try {
      const response = await fetch(`${REGISTER_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        navigate("/login", {
          state: { successMessage: "Registration successful. Please log in." },
        });
      } else {
        const data = await response.json();
        setFormError(data?.message || "Registration failed.");
      }
    } catch (error) {
      setFormError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <LoadingOverlay loading={loading} />
      <NavBar />
      <main className="flex-1 flex flex-col items-center justify-start p-8 text-center pt-20">
        <h1 className="text-2xl font-bold mb-2">Register</h1>

        <form
          onSubmit={handleRegister}
          className="flex flex-col w-72 mt-4 text-left"
        >
          {/* Global Error */}
          {formError && (
            <div className="mb-2 p-2 text-red-700 border border-red-700 rounded">
              {formError}
            </div>
          )}

          {/* First Name */}
          <label htmlFor="firstName" className="mb-1 font-semibold">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="Enter your first name"
            value={firstName}
            onChange={handleFirstNameChange}
            onBlur={() => validateFirstName(firstName)}
            className="mb-1 p-2 text-base border border-gray-300
                       rounded focus:border-blue-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-600"
          />
          {/* Real-time validation error */}
          {firstNameError && (
            <p className="text-red-600 mb-2">{firstNameError}</p>
          )}

          {/* Last Name */}
          <label htmlFor="lastName" className="mb-1 font-semibold">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="Enter your last name"
            value={lastName}
            onChange={handleLastNameChange}
            onBlur={() => validateLastName(lastName)}
            className="mb-1 p-2 text-base border border-gray-300
                       rounded focus:border-blue-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-600"
          />
          {lastNameError && (
            <p className="text-red-600 mb-2">{lastNameError}</p>
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
            onChange={handleEmailChange}
            onBlur={() => validateEmail(email)}
            className="mb-1 p-2 text-base border border-gray-300
                       rounded focus:border-blue-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-600"
          />
          {emailError && <p className="text-red-600 mb-2">{emailError}</p>}

          {/* Password */}
          <label htmlFor="password" className="mb-1 font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => validatePassword(password)}
            className="mb-1 p-2 text-base border border-gray-300
                       rounded focus:border-blue-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-600"
          />
          {passwordError && (
            <p className="text-red-600 mb-2">{passwordError}</p>
          )}

          {/* Confirm Password */}
          <label htmlFor="confirmPassword" className="mb-1 font-semibold">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => validateConfirmPassword(confirmPassword, password)}
            className="mb-1 p-2 text-base border border-gray-300
                       rounded focus:border-blue-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-600"
          />
          {confirmPasswordError && (
            <p className="text-red-600 mb-4">{confirmPasswordError}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="mb-2 py-2 px-4 bg-blue-600 text-white font-bold 
                       rounded-full border border-black hover:border-black 
                       hover:bg-blue-800"
          >
            Register
          </button>

          {/* Back to Login Button */}
          <button
            type="button"
            className="mb-4 py-2 px-4 bg-white text-black 
                       border border-black font-semibold 
                       rounded-full hover:border-black hover:bg-gray-300"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterPage;
