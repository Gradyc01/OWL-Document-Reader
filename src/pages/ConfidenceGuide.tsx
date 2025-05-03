import { useState } from 'react';

const ConfidenceGuide = () => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div className="w-full mb-4">
      <button
        onClick={toggleExpanded}
        className="w-full text-left bg-gray-200 hover:bg-gray-300 p-3 rounded flex justify-between items-center focus:outline-none"
      >
        <h2 className="text-lg font-semibold">Confidence Guide</h2>
        <span className="text-xl">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded text-left">
          <p className="mb-2">
            OCR confidence indicates the accuracy of the recognized text, where higher percentages mean more reliable recognition. Taking pictures with clear lighting on a solid background, and printing letters instead of using cursive can improve OCR confidence.
          </p>
          <ul className="list-disc pl-5">
            <li className="text-red-500">
              Below 70%: Low confidence, likely in need of manual correction
            </li>
            <li className="text-orange-500">
              70% – 79.99%: Below average confidence
            </li>
            <li className="text-yellow-500">
              80% – 89.99%: Average confidence
            </li>
            <li className="text-green-500">
              90% – 100%: High confidence, likely correct
            </li>
            <li className="text-gray-500">
              Manually modified field: Confidence has been removed for this field, as it has been modified from its original capture.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConfidenceGuide;
