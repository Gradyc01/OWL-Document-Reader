import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar_signOut";
import Footer from "../components/Footer";
import UploadButton from "../components/UploadButton";
import LoadingOverlay from "../components/LoadingOverlay";
import Toast from "../components/Toast";
import { RDS_API_URL } from "../globals";
import { useAuthedFetch } from "../hooks/UseAuthedFetch";

interface DocumentItem {
  filename: string; // unique
  name: string; // not unique
  uploadDate: Date;
  type: string;
  category: string;
  //admin only fields
  firstname: string;
  lastname: string;
  email: string;
  user_id: string
}

function getExtension(filenameOrName: string) {
  const parts = filenameOrName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function PageDashboard() {
  const user: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  } = JSON.parse(localStorage.getItem("user") ?? "{}");
  const isAdmin = JSON.parse(localStorage.getItem("isAdmin") ?? "{}");
  const USER_ID = user.username;
  const { fetchWithAuth } = useAuthedFetch();

  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<keyof DocumentItem>("uploadDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedExtension, setSelectedExtension] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const dateToLocaleString = (date: Date) => {
    return new Date(date.toUTCString()).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      }).replace(",", "")
  }

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        console.log("Fetching documents for " + USER_ID);
        let fetchingId = USER_ID
        if (isAdmin)
        {
          fetchingId = "ADMIN"
        }
        const response = await fetchWithAuth(`${RDS_API_URL}?user_id=${fetchingId}`);

        if (!response.ok) throw new Error("Failed to fetch documents");

        const responseData = await response.json();
        console.log("Raw API Response:", responseData);

        if (responseData.data.ResponseMetadata?.HTTPStatusCode === 200) {
          setLoading(false);
        } else {
          console.log("Cold start detected, retrying fetch...");
          setTimeout(fetchDocuments, 1000);
        }

        const records = responseData.data?.records || [];
        const formattedData = records.map((arr: { stringValue: string }[]) => ({
          filename: arr[0]?.stringValue || "N/A",
          name: arr[1]?.stringValue || "N/A",
          uploadDate: new Date(arr[5].stringValue + "Z"),
          type: arr[4]?.stringValue || "N/A",
          category: arr[6]?.stringValue || "N/A",
          //admin only fields
          firstname: arr[9]?.stringValue || "N/A",
          lastname: arr[10]?.stringValue || "N/A",
          email: arr[11]?.stringValue || "N/A",
          user_id: arr[3]?.stringValue || "N/A",
        }));

        setDocuments(formattedData);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setErrorMessage("Error fetching documents. Please try again later.");
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [USER_ID]);

  useEffect(() => {
    if (dateFrom && dateTo) {
      const fromDate = convertDateToUTC(dateFrom + "T00:00:00Z");
      const toDate = convertDateToUTC(dateTo + "T23:59:59Z");
      if (toDate < fromDate) {
        setDateRangeError("The 'To' date must be on or after the 'From' date.");
      } else {
        setDateRangeError("");
      }
    } else {
      setDateRangeError("");
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (dateRangeError) {
      setErrorMessage(dateRangeError);
    } else {
      if (errorMessage === "The 'To' date must be on or after the 'From' date.") {
        setErrorMessage("");
      }
    }
  }, [dateRangeError]);

  // Unique sets for dropdowns
  const uniqueTypes = useMemo(() => {
    const set = new Set(documents.map((doc) => doc.type));
    return Array.from(set);
  }, [documents]);

  const uniqueCategorys = useMemo(() => {
    const set = new Set(documents.map((doc) => doc.category));
    return Array.from(set);
  }, [documents]);

  const uniqueExtensions = useMemo(() => {
    const set = new Set(documents.map((doc) => getExtension(doc.name)));
    return Array.from(set).filter(Boolean);
  }, [documents]);

  // Sort
  const handleSort = (field: keyof DocumentItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Turn string in form YYYY-MM-DD to Date Obj. in UTC
  function convertDateToUTC(date: string) {
    const localDate = new Date(date);
    return new Date(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
      localDate.getUTCSeconds()
    );
  }

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...documents];

    // Dropdown filters
    if (!dateRangeError) {
      if (dateFrom) {
        //Z to let it know its UTC
        const fromDate: Date = convertDateToUTC(dateFrom + "T00:00:00Z");
        result = result.filter((item) => item.uploadDate >= fromDate);
      }
      if (dateTo) {
        const toDate = convertDateToUTC(dateTo + "T23:59:59Z");
        result = result.filter((item) => {
          const itemDate = item.uploadDate;
          console.log("Comparing:", itemDate, "<=", toDate);
          return itemDate <= toDate;
        });
      }
    }

    if (selectedType) {
      result = result.filter((item) => item.type === selectedType);
    }

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (selectedExtension) {
      result = result.filter(
        (item) => getExtension(item.name) === selectedExtension
      );
    }

    // Search bar
    const searchTerms = query
      .split(",")
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);

    if (searchTerms.length > 0) {
      result = result.filter((item) =>
        searchTerms.every(
          (term) =>
            item.name.toLowerCase().includes(term) ||
            dateToLocaleString(item.uploadDate).toLowerCase().includes(term) ||
            item.type.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term)
        )
      );
    }

    // Sort
    console.log("Sorting by:", sortField, sortDirection);
    if (sortField) {
      result = result.sort((a, b) => {
        const valA: string | Date = a[sortField];
        const valB: string | Date = b[sortField];
        
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    documents,
    dateFrom,
    dateTo,
    selectedType,
    selectedCategory,
    selectedExtension,
    query,
    sortField,
    sortDirection,
    dateRangeError,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = filteredAndSorted.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Selection
  const handleCheckboxChange = (filename: string) => {
    setSelectedDocs((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename]
    );
  };

  const handleSelectAllThisPage = () => {
    const pageFilenames = currentPageData.map((d) => d.filename);
    const allSelected = pageFilenames.every((f) => selectedDocs.includes(f));
    if (allSelected) {
      setSelectedDocs((prev) => prev.filter((f) => !pageFilenames.includes(f)));
    } else {
      setSelectedDocs((prev) =>
        Array.from(new Set([...prev, ...pageFilenames]))
      );
    }
  };
  const allSelectedThisPage = 
    currentPageData.length > 0 && 
    currentPageData.map((d) => d.filename).every((f) => selectedDocs.includes(f));

  // Deletion
  const handleDeleteSelected = async () => {
    if (selectedDocs.length === 0) return;
    const confirm = window.confirm(
      `Are you sure you want to delete ${selectedDocs.length} selected document(s)?`
    );
    if (!confirm) return;

    try {
      setLoading(true)
      const response = await fetchWithAuth(RDS_API_URL, {
        method: "DELETE",
        body: JSON.stringify({
          user_id: USER_ID,
          filenames: selectedDocs,
        }),
      });

      if (!response.ok) {
        setErrorMessage("Failed to delete documents. Please try again.");
        return;
      }

      setDocuments((prev) =>
        prev.filter((doc) => !selectedDocs.includes(doc.filename))
      );
      setSelectedDocs([]);
      setSuccessMessage("Documents deleted successfully!");
    } catch (error) {
      console.error(error);
      setErrorMessage("Error deleting documents.");
    } finally {
      setLoading(false) 
    }
  };

  // const handleDocumentClick = (name: string, type: string) => {
  //   navigate("/docEdit", { state: { fileName: name, type } });
  // };

  const handleDocumentClick = (fileName: string, type: string, docName: string) => {
    navigate("/docEdit", { state: { fileName: fileName, type, docName: docName } });
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const renderSortableHeader = (label: string, field: keyof DocumentItem) => {
    let arrow = "";
    if (sortField === field) {
      arrow = sortDirection === "asc" ? " ▲" : " ▼";
    }
    return (
      <th
        className="p-2 md:p-3 border cursor-pointer hover:bg-gray-200"
        onClick={() => handleSort(field)}
      >
        {label}
        {arrow}
      </th>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <LoadingOverlay loading={loading} />
      <NavBar isAdmin={isAdmin} />
      <div className="relative flex-grow flex flex-col items-start p-2 pt-8 lg:ml-20 w-full max-w-5xl">
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
        <h1 className="text-2xl font-bold mb-4">
          Welcome back, {user.firstName}
        </h1>

        {/* SEARCH + FILTERS */}
        <div className="flex flex-col gap-2 mb-4 w-full">
          {/* Existing search row */}
          <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 w-full md:w-[50%] max-w-lg">
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full outline-none"
            />
            <button onClick={handleSearch} className="ml-2">
              🔍
            </button>
          </div>

          {/* Filter Row (Date Range, Type, Category, Extension) */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full overflow-x-auto">
            {/* File Extension */}
            <div className="mb-1 md:mb-0">
              <label className="mr-1">File Extension:</label>
              <select
                value={selectedExtension}
                onChange={(e) => setSelectedExtension(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">All</option>
                {uniqueExtensions.map((ext) => (
                  <option key={ext} value={ext}>
                    {ext}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-1 md:mb-0">
              <label className="mr-1">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
            <div className="mb-1 md:mb-0">
              <label className="mr-1">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>

            {/* Type */}
            <div className="mb-1 md:mb-0">
              <label className="mr-1">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">All</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="mb-1 md:mb-0">
              <label className="mr-1">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">All</option>
                {uniqueCategorys.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* END SEARCH + FILTERS */}

        {/* Upload + Delete buttons for mobile - above table */}
        <div className="flex flex-col md:hidden w-full mb-4 space-y-2">
          <UploadButton />
          <button
            onClick={handleDeleteSelected}
            disabled={selectedDocs.length === 0}
            className="py-3 px-6 w-[200px] bg-red-600 text-white font-bold rounded-full hover:bg-red-800 transition disabled:opacity-50"
          >
            Delete selected
          </button>
        </div>

        {/* Table + Actions */}
        <div className="flex w-full items-start space-x-6">
          {/* Table */}
          <div className="flex-grow border border-gray-300 shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1.5 md:p-3 border">
                  <input
                      type="checkbox"
                      checked={allSelectedThisPage}
                      onChange={handleSelectAllThisPage}
                    />
                  </th>
                  {renderSortableHeader("Name", "name")}
                  {renderSortableHeader("Upload Date", "uploadDate")}
                  {renderSortableHeader("Type", "type")}
                  {renderSortableHeader("Category", "category")}

                  {isAdmin && (
                  <>
                    {/* ADMIN ONLY FIELDS */}
                    {renderSortableHeader("First name", "firstname")}
                    {renderSortableHeader("Last name", "lastname")}
                    {renderSortableHeader("Email", "email")}
                  </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentPageData.length > 0 ? (
                  currentPageData.map((item) => {
                    const isSelected = selectedDocs.includes(item.filename);
                    return (
                      <tr key={item.filename} className="h-12 border">
                        <td className="border p-1 md:p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCheckboxChange(item.filename)}
                          />
                        </td>
                        <td className="border p-1 md:p-2">
                          <button
                            onClick={() =>
                              handleDocumentClick(item.filename, item.type, item.name)
                            }
                            className="text-blue-500 underline"
                          >
                            {item.name}
                          </button>
                        </td>
                        <td className="border p-1 md:p-2">{dateToLocaleString(item.uploadDate)}</td>
                        <td className="border p-1 md:p-2">{item.type}</td>
                        <td className="border p-1 md:p-2">{item.category}</td>
                        {isAdmin && (
                        <>
                        {/* ADMIN ONLY FIELDS */} 
                        <td className="border p-1 md:p-2">{item.firstname}</td>
                        <td className="border p-1 md:p-2">{item.lastname}</td>
                        <td className="border p-1 md:p-2">{item.email}</td>
                        </>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center p-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="border px-2 py-1 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <div>
                Page {currentPage} of {totalPages || 1}
              </div>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="border px-2 py-1 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Upload + Delete Buttons - visible on desktop */}
          <div className="hidden md:flex flex-col items-start space-y-4">
            <UploadButton />

            <button
              onClick={handleDeleteSelected}
              disabled={selectedDocs.length === 0}
              className="py-3 px-6 w-[200px] bg-red-600 text-white font-bold rounded-full hover:bg-red-800 transition disabled:opacity-50"
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PageDashboard;
