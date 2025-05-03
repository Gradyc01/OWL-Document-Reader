import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import LoadingOverlay from "../components/LoadingOverlay";
import { RDS_API_URL, S3_API_URL } from "../globals";
import { useAuthedFetch } from "../hooks/UseAuthedFetch";
import PDFViewer from "../components/PDFViewer";

interface Field {
  Key: string;
  Value: string;
}

const PageDocument: React.FC = () => {
  const { fetchWithAuth } = useAuthedFetch();

  const isAdmin = JSON.parse(localStorage.getItem("isAdmin") ?? "{}");

  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Field[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [editingKeyIndex, setEditingKeyIndex] = useState<number | null>(null);
  const [newKey, setNewKey] = useState("");

  const [documentName, setDocumentName] = useState("");
  const docName = location.state?.docName;

  const fileName = location.state?.fileName;
  const documentType = location.state?.type;

  useEffect(() => {
    if (fileName) {
      setDocumentName(docName); 
    }

    const fetchDocument = async () => {
      if (!fileName || !documentType) {
        setErrorMessage("Missing file name or document type.");
        console.log(`FileName: ${fileName}  docType: ${documentType}`);
        setLoading(false); //otherwise infinite loading
        return;
      }

      console.log(`FileName: ${fileName}  docType: ${documentType}`);

      try {
        const response = await fetchWithAuth(
          `${S3_API_URL}?type=${documentType}&filename=${encodeURIComponent(fileName)}`
        );
        if (!response.ok) throw new Error("Failed to fetch document");

        const data = await response.json();
        const documentBase64 = data.data.document;
        const metadata = data.data.metadata;

        setFormData(
          Object.entries(metadata).map(([key, value]) => ({
            Key: key,
            Value: String(value),
          }))
        );
        determineFileType(documentBase64);
      } catch (error) {
        console.error("Error fetching document:", error);
        setErrorMessage("Failed to load document. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [fileName, documentType]);

  const determineFileType = (base64: string) => {
    const byteCharacters = atob(base64.substring(0, 50)); // Decode a small portion
    const byteArray = new Uint8Array(
      byteCharacters.split("").map((char) => char.charCodeAt(0))
    );

    let detectedType = "";
    if (byteArray[0] === 0xff && byteArray[1] === 0xd8)
      detectedType = "image/jpeg";
    else if (byteArray[0] === 0x89 && byteArray[1] === 0x50)
      detectedType = "image/png";
    else if (byteArray[0] === 0x25 && byteArray[1] === 0x50)
      detectedType = "application/pdf";
    else if (byteArray[0] === 0x50 && byteArray[1] === 0x4b)
      detectedType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    setFileType(detectedType);
    setFileUrl(`data:${detectedType};base64,${base64}`);
  };

  const handleValueChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const updatedFormData = [...formData];
    updatedFormData[index].Value = e.target.value;
    setFormData(updatedFormData);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      /* Updating Document Name */
      const rds_body = {
        filename: fileName,
        bucket: "owl-" + documentType,
        new_filename: documentName,
      };
      const rds_response = await fetchWithAuth(`${RDS_API_URL}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rds_body),
      });
      console.log(rds_body)
      console.log(rds_response.body)
      if (!rds_response.ok) throw new Error("Failed to save document");


      const updatedMetadata = Object.fromEntries(
        formData.map(({ Key, Value }) => [Key, Value])
      );
      const body = {
        fileName: fileName,
        type: documentType,
        metadata: updatedMetadata,
      };
      const response = await fetchWithAuth(`${S3_API_URL}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to save document");
      setSaveSuccess(true);
    } catch (error) {
      console.error("Error saving document:", error);
      setSaveSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFormData([...formData, { Key: "New Field", Value: "" }]);
  };

  const handleRemoveField = (index: number) => {
    setFormData(formData.filter((_, i) => i !== index));
  };

  const handleEditKey = (index: number) => {
    setEditingKeyIndex(index);
    setNewKey(formData[index].Key);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewKey(e.target.value);
  };

  const applyKeyChange = (index: number) => {
    const updatedFormData = [...formData];
    updatedFormData[index].Key = newKey;
    setFormData(updatedFormData);
    setEditingKeyIndex(null);
  };

  // Prompt incase user reloads/wants to nav out of curr page since changes unsaved
  window.addEventListener("beforeunload", function (e) {
    e.preventDefault();
  });

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <LoadingOverlay loading={loading} />
      <NavBar isAdmin={isAdmin} />
      <div className="flex flex-1">
        {errorMessage ? (
          <div className="w-full p-8 text-center text-red-600 font-bold">
            {errorMessage}
          </div>
        ) : (
          <>
          {/* Document viewer container */}
          <div className="w-1/2 sticky top-0 h-screen bg-gray-100 p-4">
            {fileUrl && fileType === "application/pdf" && (
              <PDFViewer fileUrl={fileUrl} />
            )}
            {fileUrl && fileType?.startsWith("image") && (
              <img
                src={fileUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
            {fileUrl && fileType?.startsWith("application/vnd.openxmlformats-officedocument") && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">Document preview not available</p>
              </div>
            )}
          </div>

          {/* Form container */}
          <div className="w-1/2 p-8"> {/* Removed ml-[50%] */}
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Edit Document
              </h1>
              <div className="mb-4"> {/* Wrap in a div for margin */}
                <label htmlFor="documentName" className="block text-base font-medium text-black-700 mb-1">
                  Document Name
                </label>
                <input
                  id="documentName"
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name or title"
                  className="w-full p-2 text-base border border-gray-300 rounded focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 text-center"
                />
              </div>

              <form className="grid grid-cols-2 gap-4">
                {formData.map((field, index) => (
                  <div key={index} className="relative group flex flex-col">
                    {editingKeyIndex === index ? (
                      <input
                        type="text"
                        value={newKey}
                        onChange={handleKeyChange}
                        onBlur={() => applyKeyChange(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            applyKeyChange(index);
                          }
                        }}
                        autoFocus
                        className="border rounded px-2 py-1"
                      />
                    ) : (
                      <label className="font-medium relative group">
                        {field.Key}
                        <div className="absolute inset-0 items-center justify-end flex bg-white/40 hidden group-hover:flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditKey(index)}
                            className="text-sm scale-90 cursor-pointer hover:scale-110"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(index)}
                            className="text-sm scale-90 cursor-pointer hover:scale-110"
                          >
                            ❌
                          </button>
                        </div>
                      </label>
                    )}
                    <input
                      type="text"
                      value={field.Value}
                      onChange={(e) => handleValueChange(e, index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      required
                      className="mb-0 p-2 text-base border border-gray-300 rounded focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddField}
                  className="mt-6 bg-gray-300 text-black px-4 py-2 rounded cursor-pointer hover:bg-gray-400"
                >
                  ➕ Add Field
                </button>
              </form>
              <div className="col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                  onClick={handleSave}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {saveSuccess !== null && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-100 p-6 rounded-lg shadow-lg text-center">
            <p className="text-lg font-bold">
              {saveSuccess
                ? "Document saved successfully!"
                : "Failed to save document. Please try again later."}
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => navigate("/pageDashboard")}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => setSaveSuccess(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageDocument;
