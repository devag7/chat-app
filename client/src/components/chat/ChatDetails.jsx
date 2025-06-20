export default function ChatDetails({ isOpen, onClose, chat, currentUserId, allUsers }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Chat Details</h2>
        <p>Chat details coming soon...</p>
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}
