import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

function PageChangelog() {
  const changelog = [
    {
      date: "2025-04-06",
      items: [
        "Added barcode recognition",
        "Added signature detection with bounding box shown on PDF",
        "Added dynamic loading screens",
        "Added responsive mobile dashboard",
        "Adjusted and fixed sorting by date",
        "Now allow user to edit document title with edit document page",
        "Various bug fixes",
      ],
    },
    {
      date: "2025-04-05",
      items: [
        "Changed handling of pdfs, now converts to PNGS",
        "Added ability to edit document names",
        "Added desktop support for camera",
        "Highlisting of fields in document viewer",
        "Implimented better loading screens",
        "Added multi-page and multi-file support ",
        "Various bug fixes and minor improvements",
      ],
    },
    {
      date: "2025-04-04",
      items: [
        "PDFs can now be processed per page",
        "Improved doc viewer to be more dynamic",
        "OCR now handles duplicate fields by seperating them with _x",
        "Better authentication of fetches",
        "Logo now redirects to dashboard",
      ],
    },
    {
      date: "2025-04-03",
      items: [
        "Docx is now supported",
        "Signature detection implemented in OCR",
      ],
    },
    {
      date: "2025-04-02",
      items: [
        "Colour coordination for confidence metrics",
        "Improvements to delete and data storage",
      ],
    },
    {
      date: "2025-04-01",
      items: [
        "Sorting OCR fields based on position",
        "Various bug fixes and new tests added for OCR",
        "Removed Sample Document Types",
        "Added New document types for both forms and ID",
        "Added Loading Screen when deleting documents",
        "Changed Column 'Device' to Column 'Category'",
      ],
    },
    {
      date: "2025-03-31",
      items: [
        "Fixed document previewer on page when validating/editing for better UX",
      ],
    },
    {
      date: "2025-03-30",
      items: [
        "Added the ability to categorize via Document Type when Uploading Document",
        "Known Error: Device on Page Dashboard now displays Document Type/Category",
        "Added support for HEIC and HEIF file formats",
      ],
    },
    {
      date: "2025-03-29",
      items: [
        "Added success and error messages to multiple pages",
        "Moved select all button as per feedback in dashboard",
        "Update registration page field validation to be on leave focus instead of on keystroke",
        "Add validation to ensure to date cannot be before from date",
      ],
    },
    {
      date: "2025-03-27",
      items: [
        "Bug with date filter on page dashboard fixed",
        "Browser icon updated to be owl mascot",
        "Implemented loading effect upon registration to prevent user confusion with system hang-ups",
      ],
    },
    {
      date: "2025-03-25",
      items: [
        "User-edited fields in the document validation page now propagates",
        "Fixed reload bug that erased the document validation page",
      ],
    },
    {
      date: "2025-03-24",
      items: [
        "Added changelog page",
        "Bug with being unable to edit initally empty fields fixed",
      ],
    },
    {
      date: "2025-03-23",
      items: [
        "Added delete, sort, select buttons, and pagination to dashboard page",
      ],
    },
    {
      date: "2025-03-22",
      items: ["Uploaded documents can be edited"],
    },
    {
      date: "2025-03-20",
      items: [
        "Document upload connected to S3",
        "User-specific documents are now shown",
        "Loading screen added upon document upload",
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <div className="flex-grow w-full max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6 text-left">Changelog</h1>
        <div className="space-y-6 w-full text-left">
          {changelog.map((entry) => (
            <div key={entry.date}>
              <h2 className="text-lg font-semibold mb-2">{entry.date}</h2>
              <ul className="list-disc list-inside text-gray-700">
                {entry.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PageChangelog;
