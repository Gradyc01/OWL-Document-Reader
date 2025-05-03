import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingOverlay from "../components/LoadingOverlay";
import { S3_API_URL, RDS_API_URL } from "../globals";
import { useAuthedFetch } from "../hooks/UseAuthedFetch";
import PDFViewer from "../components/PDFViewer";
import ConfidenceGuide from "./ConfidenceGuide";

interface Field {
  Key: string;
  Value: string;
  Confidence: number;
  BBox?: {
    Left: number;
    Top: number;
    Width: number;
    Height: number;
  };
  PageNumber?: number;
}

const DocValidate: React.FC = () => {
  const { fetchWithAuth } = useAuthedFetch();
  
  const isAdmin = JSON.parse(localStorage.getItem("isAdmin") ?? "{}");

  const navigate = useNavigate();
  const location = useLocation();
  const base64FileFromState = location.state?.base64File;
  const selectedDocumentType = location.state?.category;
  const user_id = location.state?.user_id;
  const original_filename = location.state?.fileName;
  const processType = location.state?.processType;
  const fileData: Field[] = location.state?.fileData || []; // Ensure fileData is an array of Field objects

  const [formData, setFormData] = useState<Field[]>(fileData);
  const [editingKeyIndex, setEditingKeyIndex] = useState<number | null>(null);
  const [newKey, setNewKey] = useState("");
  const [originalKey, setOriginalKey] = useState<string | null>(null);

  const [documentName, setDocumentName] = useState("");
  // Document for DocViewer
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [hoveredFieldIndex, setHoveredFieldIndex] = useState<number | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    if (
      !location.state ||
      !fileData ||
      !processType ||
      !base64FileFromState || 
      !original_filename ||
      !user_id ||
      !selectedDocumentType
    ) {
      console.warn("DocValidate: location.state is missing or incomplete. Redirecting.");
      alert("Session data expired or invalid. Please upload the document again.");
      navigate("/docUpload"); 
    } else {
      if (fileData.length === 0) {
        alert("OCR was unable to extract any meaningful fields. Please make sure you have uploaded the correct file, or add the fields manually.");
      }
      if (original_filename) {
        setDocumentName(original_filename); 
      }
      setFileUrl(`data:application/pdf;base64,${base64FileFromState}`);
      console.log("DocValidate: Received state:", location.state); 
    }
    setLoading(false);
  }, [fileData, processType, base64FileFromState, navigate, location.state]);

  // Handle changes to form fields
  const handleValueChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const updatedFormData = [...formData];
    updatedFormData[index].Value = e.target.value; // Update the Value for the specific field
    updatedFormData[index].Confidence = 101;
    setFormData(updatedFormData);
  };

  const handleAddField = () => {
    setFormData([...formData, { Key: "New Field", Value: "", Confidence: 101 }]);
  };

  const handleRemoveField = (index: number) => {
    setFormData(formData.filter((_, i) => i !== index));
  };

  const handleEditKey = (index: number) => {
    setEditingKeyIndex(index);
    setNewKey(formData[index].Key);
    setOriginalKey(formData[index].Key);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewKey(e.target.value);
  };

  const applyKeyChange = (index: number) => {
    const updatedFormData = [...formData];
    updatedFormData[index].Key = newKey;
    if (originalKey !== newKey) {
      updatedFormData[index].Confidence = 101;
    }
    setFormData(updatedFormData);
    setEditingKeyIndex(null);
  };

  //use check on given values for fields only once;
  //afterwards, fields can be whatever user wants
  const [initialValue, setInitialValue] = useState<boolean>(false);

  useEffect(() => {
    if (!initialValue) {
      const updatedFormData = formData.map((field) => {
        return {
          ...field,
          Value:
            field.Value !== "" && field.Confidence > 10.0 ? field.Value : "",
        };
      });
      setFormData(updatedFormData);
      setInitialValue(true);
    }
  }, [initialValue, formData]);

  //Ensure user edited changes are actually saved
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      const fileName = await postFileToRDS(documentName, processType)
      await postFileToS3(fileName, base64FileFromState, processType, fileData)
      
      const updatedMetadata = Object.fromEntries(
        formData.map(({ Key, Value }) => [Key, Value])
      );
      const body = {
        fileName: fileName,
        type: processType,
        metadata: updatedMetadata,
      };
      const response = await fetchWithAuth(`${S3_API_URL}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to update document");
      
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setLoading(false);
    }
  };

  const postFileToS3 = async (
      filename: string,
      b64File: string,
      processType: string,
      extractedData: any
    ) => {
      const transformedData = transformArrayToObj(extractedData);
      const body = {
        file: b64File,
        fileName: filename,
        type: processType,
        metadata: transformedData,
      };
  
      try {
        const response = await fetchWithAuth(`${S3_API_URL}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
  
        if (response.ok) {
          console.log("File posted to S3 successfully.");
          setSuccessMessage("File posted to S3 successfully!");
        } else {
          console.error("S3 POST Response error: ", await response.json());
          setErrorMessage("Failed to post file to S3.");
        }
      } catch (error) {
        console.error("Error thrown while trying to POST to S3: ", error);
        setErrorMessage("Error occurred while posting file to S3.");
      }
    };
  
    const postFileToRDS = async (fileName: string, processingOpt: string) => {
      const metadata: any = {
        original_filename: fileName,
        bucket: "owl-" + processingOpt, //either owl-forms or owl-ids
        user_id: user_id,
        doc_type: processingOpt, //must be either "forms" or "ids"
        // device: "PC",
        // ip: "7",
      };
      if (selectedDocumentType !== "Unspecified") {
        metadata.category = selectedDocumentType;
      }
  
      try {
        const payload = {
          method: "POST",
          body: JSON.stringify(metadata),
        };
  
        const response = await fetchWithAuth(`${RDS_API_URL}`, payload);
        const responseJson = await response.json();
        if (response.ok) {
          console.log("File posted to RDS successfully.");
          setSuccessMessage("File posted to RDS successfully!");
          return responseJson.data.filename;
        } else {
          console.error("RDS POST Response error: ", response);
          setErrorMessage("Failed to post file to RDS.");
        }
      } catch (error) {
        console.error("Error thrown while trying to POST to RDS: ", error);
        setErrorMessage("Error occurred while posting file to RDS.");
      }
      return "";
    };
  
    const transformArrayToObj = (arr: any) => {
      const obj: any = {};
      arr.forEach((item: any) => {
        obj[item.Key] = item.Value;
      });
      return obj;
    };

  // Handle the save, and then navigate to pageDashboard
  async function handleSubmitDocument() {
    await handleSave();
    navigate("/pageDashboard");
  }

  // Prompt incase user reloads/wants to nav out of curr page since changes unsaved
  window.addEventListener("beforeunload", function (e) {
    e.preventDefault();
    // Chrome requires returnValue to be set (is this still true???)
    e.returnValue = "";
  });

  const renderOverlay = (pageNumber: number, dims: { width: number; height: number }) => {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: dims.width,
          height: dims.height,
          pointerEvents: "none",
        }}
      >
        {formData.map((field, i) => {
          if (!field.BBox) return null;
          if (field.PageNumber !== pageNumber) return null;
          const { Left, Top, Width, Height } = field.BBox;
          const leftPx = Left * dims.width;
          const topPx = Top * dims.height;
          const wPx = Width * dims.width;
          const hPx = Height * dims.height;
          const isHovered = hoveredFieldIndex === i;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: leftPx,
                top: topPx,
                width: wPx,
                height: hPx,
                border: isHovered ? "2px solid red" : "2px solid transparent",
                backgroundColor: isHovered ? "rgba(255, 0, 0, 0.2)" : "transparent",
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <LoadingOverlay loading={loading} />
      <NavBar isAdmin={isAdmin} />

    {/* Image & Form container */}
    <div className="flex flex-1">
      {/* Left side - Document viewer */}
      <div className="w-1/2 sticky top-0 h-screen p-4 overflow-auto">
        {fileUrl && 
          <PDFViewer 
            fileUrl={fileUrl} 
            renderOverlay={renderOverlay} 
            hoveredFieldBoundingBox={
              hoveredFieldIndex !== null &&
              formData[hoveredFieldIndex]?.BBox &&
              formData[hoveredFieldIndex]?.PageNumber
                ? {
                    pageNumber: formData[hoveredFieldIndex].PageNumber || 1,
                    bbox: formData[hoveredFieldIndex].BBox,
                  }
                : undefined
            }
          />
        }
      </div>

      {/* Right side - Form */}
      <div className="w-1/2 p-8">
          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Document Validation
          </h1>
          {/* Confidence Guide */}
          <ConfidenceGuide />
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
          {/* Success/Error Messages */}
          <Toast
              message={successMessage}
              type="success"
              onClose={() => setSuccessMessage("")}
            />
            <Toast
              message={errorMessage}
              type="error"
              onClose={() => setErrorMessage("")}
            />
          {/* Form */}
          <form className="grid grid-cols-2 gap-4">
            {formData.map((field, index) => (
              <div 
                key={index} 
                className="relative group flex flex-col" 
                onMouseEnter={() => {
                  setHoveredFieldIndex(index);
                }}
                onMouseLeave={() => {
                  setHoveredFieldIndex(null);
                }}
              >
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
                    <div className="absolute inset-0 items-center justify-end bg-white/40 hidden group-hover:flex gap-1">
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
                {(() => {
                  const confidence = field.Confidence;
                  let textColor = "text-gray-500";
                  let textContent = `Confidence: ${confidence.toFixed(2)}%`;
                  if (confidence < 70) {
                    textColor = "text-red-500";
                  } else if (confidence < 80) {
                    textColor = "text-orange-500";
                  } else if (confidence < 90) {
                    textColor = "text-yellow-500";
                  } else if (confidence <= 100) {
                    textColor = "text-green-500";
                  } else {
                    textContent = "Manually modified field";
                  }
                  return <span className={`text-sm ${textColor}`}>{textContent}</span>;
                })()}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddField}
              className="mt-6 mb-6 bg-gray-300 text-black px-4 py-2 rounded cursor-pointer hover:bg-gray-400"
            >
              ➕ Add Field
            </button>
          </form>
          {/* Save Button */}
          <div className="col-span-2 mt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded
                         hover:bg-blue-700 transition-colors duration-200"
              onClick={() => handleSubmitDocument()}
            >
              Save Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocValidate;
