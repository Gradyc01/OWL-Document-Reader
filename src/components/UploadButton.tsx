import { useNavigate } from "react-router-dom";

function UploadButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/docUpload")} // Navigate to DocUpload page
      className="py-3 px-6 w-[200px] bg-blue-600 text-white font-bold rounded-full hover:bg-blue-800 transition"
    >
      Upload document
    </button>
  );
}

export default UploadButton;