import { SetStateAction } from "react";

type GlobalModalProps = {
  showModal: boolean;
  setShowModal: (value: SetStateAction<boolean>) => void;
  title: string;
  inputPlaceholder: string;
  inputValueString: string;
  setInputValString: (value: SetStateAction<string>) => void;
  submitFunc(): Promise<void>;
  submitButtonText: string;
};

export default function GlobalModal({
  showModal,
  setShowModal,
  title,
  inputPlaceholder,
  inputValueString,
  setInputValString,
  submitFunc,
  submitButtonText,
}: GlobalModalProps) {
  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {title}
            </h2>
            <input
              type="text"
              className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              placeholder={inputPlaceholder}
              value={inputValueString}
              onChange={(e) => setInputValString(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
              >
                Cancel
              </button>
              <button
                onClick={submitFunc}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
              >
                {submitButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
