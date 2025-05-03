import { useState, useRef, useCallback, useEffect } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";
import AdvanceLoading from "../components/AdvanceLoading";
import Toast from "../components/Toast";
import { OCR_API_URL, DOCX_PDF_URL, PDF_IMAGES_URL, IMAGES_PDF_URL, PDF_COMPRESSION_URL, IMAGE_COMPRESSION_URL, IMAGE_RESIZE_URL } from "../globals";
import { useIsMobile } from "../hooks/useIsMobile";

import heic2any from "heic2any";
import { useAuthedFetch } from "../hooks/UseAuthedFetch";

interface myFile extends File {
  id: string;
}
function DocUpload() {
  const isMobile = useIsMobile();
  const user = JSON.parse(localStorage.getItem("user") ?? "");
  const isAdmin = JSON.parse(localStorage.getItem("isAdmin") ?? "{}");
  const USER_ID = user.username;
  const { fetchWithAuth } = useAuthedFetch();

  const [drag, setDrag] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<myFile[]>([]);
  const [loading, setLoading] = useState(false);

  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [lowerLimit, setLowerLimit] = useState(0);
  const [upperLimit, setUpperLimit] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const navigate = useNavigate();

  // Processing Options
  const initialSelectOpt = "Select an Option";
  const [selectOption, setSelectOption] = useState(initialSelectOpt);
  const dropDownOptions = ["ID", "Form"];

  //Category Type
  const unknownDocumentCategory: string = "Unspecified";
  const idOptions: string[] = [
    "Unknown Document Category",
    "Driver's License",
    "Passport",
    "Birth Certificate",
    "BC Services Card",
    "Permanent Resident Card",
    "Social Insurance Number (SIN)",
    "Student ID",
  ];

  const formOptions: string[] = [
    "Unknown Document Category",
    "Utility Bill",
    "Application",
    "Property Tax",
    "Lease Agreement",
    "Bank Statement",
    "Income Tax Return",
    "Insurance Policy",
    "Medical Report",
    "Employment Verification",
    "Mortgage Application",
    "Vehicle Registration",
    "Pay Stub",
    "Rental Agreement",
  ];
  const documentTypeOptions: string[] =
    selectOption === "ID" ? idOptions : formOptions;
  // const documentTypeOptions: string[] = ;
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>(
    unknownDocumentCategory
  );

  /**
   * Function to stop the camera stream and reset the state.
   **/
  const stopStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  /**
   * Function to reset and start the camera stream.
   **/
  const startCamera = async () => {
    setLoading(true);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Camera not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setErrorMessage("Camera permission denied by browser.");
        } else if (err.name === "NotFoundError") {
          setErrorMessage("No camera detected.");
        } else {
          setErrorMessage(`Error accessing camera: ${err.message}`);
        }
      } else {
        setErrorMessage("An unknown error occurred while accessing the camera.");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (cameraStream) {
      console.log("Camera stream state updated, checking video element...");
      console.log("Video element reference:", videoRef.current ? "available" : "not available");
      
      if (videoRef.current) {
        try {
          console.log("Setting video srcObject...");
          videoRef.current.srcObject = cameraStream;
          
          videoRef.current.onloadedmetadata = () => {
            console.log(
              "Video metadata loaded, dimensions:",
              videoRef.current?.videoWidth,
              "x",
              videoRef.current?.videoHeight
            );
          };
          
          videoRef.current.onerror = (e) => {
            console.error("Video element error:", e);
            setErrorMessage("Error displaying video feed");
          };
        } catch (videoErr) {
          console.error("Error setting video srcObject:", videoErr);
          setErrorMessage("Error initializing video element");
        }
      } else {
        setErrorMessage("Video element not available");
      }
      
      return () => {
        stopStream();
      };
    }
  }, [cameraStream, stopStream]);

  /**
   * Function to take a photo from the camera stream.
   **/
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && cameraStream) {
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "photo.jpg", { type: "image/jpeg" });

            const fileWithId = Object.assign(file, {
              id: Date.now() + Math.random().toString(36).substring(2, 9),
            }) as myFile;

            setFiles((prevFiles) => [...prevFiles, fileWithId]);
          }
        }, "image/jpeg");
        
        stopStream();
      }
    }
  };

  /**
   * Func. for UI purposes; if file is ontop of upload doc. box,
   * set the variables accordingly
   *
   * @param e is event object
   */
  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDrag(1);
    } else {
      setDrag(0);
    }
  }

  /**
   * Handle file drop event if user does not click select file button
   *
   * @param e is event object generated when file dropped
   */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDrag(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).map((file) => {
        return Object.assign(file, {
          id: Date.now() + Math.random().toString(36).substring(2, 9),
        }) as myFile;
      });

      setFiles((prevFiles) => [...prevFiles, ...filesArray]);
      e.dataTransfer.clearData();
    }
  }

  /**
   * Clears current inputRef, and opens the FileManager upon click of
   * "Select a file"
   */
  function handleClick() {
    inputRef.current?.click();
    // Because button tied to inputRef and upload called onChange,
    // want uploadFile to call regardless of same file
    if (inputRef.current != null) {
      inputRef.current.value = "";
    }
  }

  /**
   * Called when file is uploaded via button click;
   * sets value of file to be whatever was uploaded
   */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      const filesArray = Array.from(e.target.files).map((file) => {
        return Object.assign(file, {
          id: Date.now() + Math.random().toString(36).substring(2, 9),
        }) as myFile;
      });
      setFiles((files) => [...files, ...filesArray]);
    }
  }

  /**
   * On click of X button of a file, remove it
   */
  function removeFile(idToRemove: string) {
    setFiles(files.filter((file) => file.id !== idToRemove));
  }

  /**
   * Handle upload button when user wants to process their documents
   */
  function handleUpload() {
    uploadFile(files);
  }

  /**
   * Convert a file to a base64-encoded string.
   *
   * @param file The file to convert.
   * @returns A promise that resolves to the base64-encoded string.
   */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(",")[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert file to base64."));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Upload the file to the API endpoints.
   *
   * @param file The list of files to upload.
   */
  async function uploadFile(files: myFile[]) {
    setAdvanceLoading(true);
    setLowerLimit(0.0);
    setUpperLimit(0.45);
    setLoadingMessage("Preprocessing files...")

    try {
      //get processing option i.e. form or id
      const selectedDocType: string = selectOption.toLowerCase();
      //selectedDocType += "s";
      if (selectedDocType === initialSelectOpt.toLocaleLowerCase()) {
        alert("Please select a Processing Option");
        return;
      }

      const base64Files: string[] = (
        await Promise.all(files.map((file) => getBase64Images(file)))
      ).flat();

      const base64ResizedFiles: string[] = await Promise.all(base64Files.map((file) => resizeb64Image(file)));

      setLowerLimit(0.45);
      setUpperLimit(0.95);
      setLoadingMessage("Running text recognition...")

      // Prepare the payload
      const payload = {
        docType: selectedDocType,
        images: base64ResizedFiles, // Now this contains the list of all base64 images
      };

      // Call the OCR API
      const response = await fetchWithAuth(`${OCR_API_URL}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} ${response.statusText}`
        );
      }

      const dataRaw = await response.json();
      const data = dataRaw.flatMap((item: any) => item.Result);

      console.log("OCR API Raw Response:", dataRaw);
      console.log("OCR API Response:", data);

      setLowerLimit(0.95);
      setUpperLimit(1);
      setLoadingMessage("Compiling files...")

      const b64PDF = await convertb64ImageTob64PDF(base64ResizedFiles);

      // Navigate to the next page with the API response data and original file for preview
      navigate("/docValidate", {
        state: {
          fileData: data,
          base64File: b64PDF,
          user_id: USER_ID,
          category: selectedDocumentType,
          fileName: files[0].name, // TODO: DISCUSS HOW TO HANDLE THIS and file.type
          processType: selectedDocType + "s",
        },
      });
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(
        "Upload failed. The files may be too large or in an unsupported format. Please check the file size and type, then try again."
      );
      setAdvanceLoading(false);
    }
  }

  /**
   * resize a b64 image to have the same width as a letter size paper.
   *
   * @param b64Image The base64 image to resize.
   * @returns The base64 resized image.
   */
  async function resizeb64Image(b64Image: string): Promise<string> {
    console.log("Resizing the Image...");

    const body = {
      image_base64: b64Image,
    };

    const response = await fetchWithAuth(`${IMAGE_RESIZE_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("Image Resizing Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to compress image.");
    }

    return responseJson.resized_image;
  }

  /**
   * Convert HEIC files to JPEG format.
   *
   * @param file The HEIC file to convert.
   * @returns The converted JPEG file in base64.
   */
  async function convertHEICToJPEG(file: File): Promise<File> {
    console.log("Converting HEIC to JPEG...");
    return (await heic2any({
      blob: file,
      toType: "image/jpeg",
    })) as File;
  }

  /**
   * Convert a base64 PDF files to a list of images (one per page).
   *
   * @param b64PDF The base64 PDF file to convert.
   * @returns The list of base64-encoded images.
   */
  async function convertPDFb64ToImagesb64(b64PDF: string): Promise<string[]> {
    console.log("Converting PDF to list of images...");

    const body = {
      pdf_base64: b64PDF,
    };
    
    const response = await fetchWithAuth(`${PDF_IMAGES_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("PDF to Images Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to convert PDF to Images.");
    }

    return responseJson.image_list;
  }

  /**
   * Convert a list of base64 images to one base64 PDF file (one image per page).
   *
   * @param images The list of base64 images to convert.
   * @returns The base64-encoded pdf.
   */
  async function convertb64ImageTob64PDF(images: string[]): Promise<string> {
    console.log("Converting images to one unified PDF...");

    const body = {
      images: images,
    };

    const response = await fetchWithAuth(`${IMAGES_PDF_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("Images to PDF Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to images to PDF.");
    }

    return responseJson.pdf_base64;
  }

  /**
   * Convert a DOCX to a base64 PDF file.
   *
   * @param file The DOCX file to convert.
   * @returns The converted base64 PDF file.
   */
  async function convertDOCXToPDFb64(file: File): Promise<string> {
    console.log("Converting DOCX to PDF...");
    const base64Docx = await fileToBase64(file);

    const body = {
      base64_docx: base64Docx,
    };

    const response = await fetchWithAuth(`${DOCX_PDF_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("DOCX to PDF Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to convert DOCX to PDF.");
    }

    return responseJson.base64_pdf;
  }

  /**
   * Compress a base64 PDF files by image compression.
   *
   * @param b64PDF The base64 PDF file to compress.
   * @returns The base64 compressed PDF file.
   */
  async function compressb64PDF(b64PDF: string): Promise<string> {
    console.log("Compressing the PDF...");

    const body = {
      pdf_base64: b64PDF,
    };

    const response = await fetchWithAuth(`${PDF_COMPRESSION_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("PDF Compression Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to compress PDF.");
    }

    return responseJson.compressed_pdf;
  }

  /**
   * Compress a base64 image.
   *
   * @param b64Image The base64 image to compress.
   * @returns The base64 compressed image.
   */
  async function compressb64Image(b64Image: string): Promise<string> {
    console.log("Compressing the Image...");

    const body = {
      image_base64: b64Image,
    };

    const response = await fetchWithAuth(`${IMAGE_COMPRESSION_URL}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const responseJson = await response.json();
    console.log("Image Compression Response:", responseJson);

    if (!response.ok) {
      throw new Error("Failed to compress image.");
    }

    return responseJson.compressed_image;
  }

  /**
   * Convert the given file to a list of base64-encoded images.
   *
   * @param file The file to convert.
   * @returns The list of converted base64 images.
   */
  async function getBase64Images(file: File): Promise<string[]> {
    console.log("File type:", file.type);
    if (["image/png", "image/jpeg"].includes(file.type)) {
      const b64 = await fileToBase64(file);
      const b64Compressed = await compressb64Image(b64);
      return [b64Compressed];
    } else if (["", "image/heic", "image/heif"].includes(file.type)) {
      let convertedFile: File = file;
      try {
        convertedFile = await convertHEICToJPEG(file);
      } catch (error) {
        console.error("Error converting HEIC to JPEG:", error);
      }
      const b64 = await fileToBase64(convertedFile);
      const b64Compressed = await compressb64Image(b64);
      return [b64Compressed];
    } else if (file.type === "application/pdf") {
      const b64PDF = await fileToBase64(file);
      const b64CompressedPDF = await compressb64PDF(b64PDF);
      return await convertPDFb64ToImagesb64(b64CompressedPDF);
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const b64PDF = await convertDOCXToPDFb64(file);
      const b64CompressedPDF = await compressb64PDF(b64PDF);
      return await convertPDFb64ToImagesb64(b64CompressedPDF);
    } else {
      throw new Error("File type is not supported"); 
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Screen */}
      <LoadingOverlay loading={loading} />
      <AdvanceLoading
                loading={advanceLoading}
                message={loadingMessage}
                lower_limit_frac={lowerLimit}
                upper_limit_frac={upperLimit}
            />

      {/* Camera Stream */}
      {cameraStream && (
        <div className="fixed w-full h-full bg-gray-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg w-3/4">
            <div className="relative aspect-video bg-black mb-4 rounded overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ 
                  display: 'block',
                  minWidth: '100%',
                  minHeight: '100%'
                }}
                onPlay={() => console.log("Video playback started")}
              />
            </div>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={takePhoto}
                className="px-6 py-3 text-lg bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                Capture
              </button>
              <button 
                onClick={stopStream}
                className="px-6 py-3 text-lg bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden canvas for taking photo */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="navbar-container">
        <NavBar isAdmin={isAdmin} />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Document Upload
          </h1>
          <p className="mt-2 text-gray-600">
            <span className="font-bold">Step 1:</span> Select a processing
            option
            <br />
            <span className="font-bold">Step 2:</span> Upload your document
          </p>
        </div>

        {/* Processing Opt*/}
        <div className="flex flex-col gap-8">
          {/* Processing Options (ontop of box) */}
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-500">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">
                1
              </span>
              Select Processing Option{" "}
              <span className="text-red-500 ml-1">*</span>
            </h2>

            {/*Radio Buttons*/}
            <div className="flex flex-wrap gap-15">
              {dropDownOptions.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="processingOption"
                    value={option}
                    checked={selectOption === option}
                    onChange={() => setSelectOption(option)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label
                    htmlFor={`option-${index}`}
                    className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-500">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">
                2
              </span>
              Select Document Category 
            </h2>
            {selectOption === initialSelectOpt ? (
              <div className="bg-gray-100 p-4 rounded-lg text-center flex items-center justify-center">
                <div className="flex flex-col items-center">
                  {/* svg + path for the lock symbol */}
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-600 text-lg font-medium">
                    Please select a Processing Option
                  </p>
                  <p className="text-gray-500 mt-2">
                    Step 1 must be completed before uploading
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex flex-col items-center text-center">
                {" "}
                {/* Wrapper with bottom margin */}
                <select
                  id="documentType"
                  name="documentType"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="block w-full p-2 border border-gray-300 rounded focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {documentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* File Upload Section; condtionally based on processing opt. value */}
          {/* <h2 className="text-xl font-semibold mt-2">Upload Document</h2> */}
          <div
            className={`relative bg-white p-6 rounded-lg shadow-md ${
              selectOption === "Select a processing option"
                ? "opacity-50 cursor-not-allowed border-2 border-dashed border-gray-300"
                : "border-2 border-blue-500"
            }`}
          >
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">
                  3
                </span>
                Upload Document
              </h2>

              {/* submit button */}
              {files.length > 0 && (
                <button
                  onClick={handleUpload}
                  className="inline-flex items-center  
                  px-6 py-3 border border-transparent 
                  text-xl font-medium rounded-full 
                  text-white bg-blue-600  
                  hover:bg-blue-800 
                  focus:outline focus:ring-2
                  focus:ring-offset-2 focus:ring-blue-500 -mt-3.5"
                >
                  Upload
                </button>
              )}
            </div>

            {/* Upload Box */}
            {selectOption === initialSelectOpt ? (
              <div className="bg-gray-100 p-4 rounded-lg text-center h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                  {/* svg + path for the lock symbol */}
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-600 text-lg font-medium">
                    Please select a Processing Option
                  </p>
                  <p className="text-gray-500 mt-2">
                    Step 1 must be completed before uploading
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-lg shadow-sm h-[400px] flex flex-col items-center justify-center -mt-2
    ${
      drag
        ? "border-2 border-dashed border-blue-500 bg-blue-50"
        : "border-2 border-dashed border-gray-300"
    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-full px-8 py-4 flex-1 flex flex-col">
                  {/* display user selected files as pills starting topleft corner */}
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-auto">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm"
                        >
                          <span className="mr-1">{file.name}</span>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-sm scale-90 cursor-pointer hover:scale-120"
                            aria-label="Remove file"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/*upload doc content; conditionally show either "Select Files" or "Add More Files" */}
                  <div className="flex flex-col items-center justify-center flex-1">
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      multiple
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/heic,image/heif"
                    />

                    {files.length === 0 ? (
                      <div>
                        <button
                          onClick={handleClick}
                          className="inline-flex items-center  
                          px-12 py-5 border border-transparent 
                          text-xl font-medium rounded-full 
                          text-white bg-blue-600  
                          hover:bg-blue-800 
                          focus:outline focus:ring-2
                          focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Select files
                        </button>
                        
                        {!isMobile && (
                          <>
                            <p className="text-base text-gray-600 mt-2">
                              or
                            </p>
                            <button
                              onClick={startCamera}
                              className="inline-flex items-center  
                              px-12 py-5 mt-2 border border-transparent 
                              text-xl font-medium rounded-full 
                              text-white bg-blue-600  
                              hover:bg-blue-800 
                              focus:outline focus:ring-2
                              focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Take a photo
                            </button>
                          </>
                        )}
                        <p className="text-base text-gray-600 mt-2">
                          or drag and drop your files here
                        </p>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleClick}
                          className="inline-flex items-center  
                          px-12 py-5 border border-transparent 
                          text-xl font-medium rounded-full 
                          text-white bg-blue-600  
                          hover:bg-blue-800 
                          focus:outline focus:ring-2
                          focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Add more files
                        </button>
                        
                        {!isMobile && (
                          <>
                            <p className="text-base text-gray-600 mt-2">
                              or
                            </p>
                            <button
                              onClick={startCamera}
                              className="inline-flex items-center  
                              px-12 py-5 mt-2 border border-transparent 
                              text-xl font-medium rounded-full 
                              text-white bg-blue-600  
                              hover:bg-blue-800 
                              focus:outline focus:ring-2
                              focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Take a photo
                            </button>
                          </>
                        )}
                        <p className="text-base text-gray-600 mt-2">
                          or drag and drop more files
                        </p>
                      </>
                    )}
                  </div>

                  {/* accepted formats*/}
                  <div className="text-sm text-gray-600 items-center">
                    Accepted formats:{" "}
                    <span className="font-medium text-sm text-gray-700">
                      PDF, DOCX, JPEG, PNG, HEIC
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DocUpload;
